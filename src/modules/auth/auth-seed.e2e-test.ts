import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Env } from '../../config/env';
import { AdminSeedService } from './application/admin-seed.service';
import { bootApp, deleteE2EUser, prepareE2EEnv, type E2EContext } from './e2e-helpers';
import { ARGON2ID_PHC_PREFIX, Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { SeedModule } from './presentation/cli/seed.module';

const EMAIL = `seed-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;
const FIRST_PASSWORD = 'seed-first-password-1';
const ROTATED_PASSWORD = 'seed-rotated-password-2';

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let seedApp: INestApplicationContext;
let seeder: AdminSeedService;

beforeAll(async () => {
  ctx = await bootApp(env);
  // The same application context `npm run seed:admin` builds, minus main().
  seedApp = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn'],
  });
  seeder = seedApp.get(AdminSeedService);
});

afterAll(async () => {
  await deleteE2EUser(ctx.prisma, EMAIL);
  await seedApp.close();
  await ctx.app.close();
});

describe('npm run seed:admin (SPEC C12)', () => {
  it('package.json exposes the seed:admin script', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts['seed:admin']).toContain('dist/modules/auth/presentation/cli/seed-admin.js');
  });

  it('creates the admin with an OWASP argon2id PHC hash', async () => {
    const result = await seeder.run({ email: EMAIL, password: FIRST_PASSWORD });

    expect(result).toEqual({ email: EMAIL, created: true });
    const rows = await ctx.prisma.user.findMany({ where: { email: EMAIL } });
    expect(rows).toHaveLength(1);
    expect(rows[0].passwordHash.startsWith(ARGON2ID_PHC_PREFIX)).toBe(true);
  });

  it('is idempotent: a second run upserts instead of duplicating', async () => {
    const result = await seeder.run({ email: EMAIL, password: FIRST_PASSWORD });

    expect(result.created).toBe(false);
    expect(await ctx.prisma.user.count({ where: { email: EMAIL } })).toBe(1);
  });

  it('a re-run rotates the password and the seeded admin can log in', async () => {
    await seeder.run({ email: EMAIL, password: ROTATED_PASSWORD });

    const [row] = await ctx.prisma.user.findMany({ where: { email: EMAIL } });
    const hasher = new Argon2PasswordHasher();
    expect(await hasher.verify(row.passwordHash, ROTATED_PASSWORD)).toBe(true);
    expect(await hasher.verify(row.passwordHash, FIRST_PASSWORD)).toBe(false);

    const login = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: ROTATED_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.tokenType).toBe('Bearer');
  });
});
