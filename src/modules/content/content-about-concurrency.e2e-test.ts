import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Env } from '../../config/env';
import {
  bootApp,
  createE2EUser,
  deleteE2EUser,
  prepareE2EEnv,
  type E2EContext,
} from '../auth/e2e-helpers';

const PASSWORD = 'e2e-about-cas-password-123';
const EMAIL = `about-cas-e2e-${randomBytes(6).toString('hex')}@e2e.test`;

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let token: string;

async function login(): Promise<string> {
  const response = await request(ctx.app.getHttpServer())
    .post('/auth/login')
    .send({ email: EMAIL, password: PASSWORD });
  return response.body.accessToken as string;
}

async function resetAbout(): Promise<void> {
  await ctx.prisma.aboutContent.deleteMany({});
}

beforeAll(async () => {
  ctx = await bootApp(env);
  await createE2EUser(ctx.prisma, EMAIL, PASSWORD);
  token = await login();
  await resetAbout();
});

afterAll(async () => {
  await resetAbout();
  await deleteE2EUser(ctx.prisma, EMAIL);
  await ctx.app.close();
});

describe('PUT /about optimistic concurrency (plan WU-3/D8)', () => {
  it('rejects a stale expectedUpdatedAt with 409 + conflicts and leaves the document unchanged', async () => {
    const base = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'CAS User',
        descriptions: [{ en: 'desc', ru: 'описание' }],
        stats: {},
        ctaLabel: null,
      });
    expect(base.status).toBe(200);
    const updatedAt = base.body.updatedAt as string;

    const stale = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'Stale write',
        expectedUpdatedAt: new Date(new Date(updatedAt).getTime() - 60_000).toISOString(),
      });

    expect(stale.status).toBe(409);
    expect(stale.body.status).toBe(409);
    expect(stale.body.conflicts.key).toBe('concurrent-modification');
    expect(stale.body.conflicts.currentUpdatedAt).toBe(updatedAt);

    const current = await request(ctx.app.getHttpServer()).get('/about');
    expect(current.body.fullName).toBe('CAS User');
  });

  it('reports the replaced portrait key in X-Replaced-Media-Key', async () => {
    const first = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'CAS User',
        descriptions: [{ en: 'desc', ru: 'описание' }],
        stats: {},
        ctaLabel: null,
        portrait: 'first-key.webp',
      });
    expect(first.status).toBe(200);
    const updatedAt = first.body.updatedAt as string;

    const second = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'CAS User',
        expectedUpdatedAt: updatedAt,
        portrait: 'second-key.webp',
      });

    expect(second.status).toBe(200);
    expect(second.headers['x-replaced-media-key']).toBe('first-key.webp');
  });
});
