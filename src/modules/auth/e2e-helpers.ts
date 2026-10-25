/**
 * Shared bootstrapping for the auth e2e suites (test-only file: excluded
 * from `tsconfig.build.json`). Each suite creates its own Nest app, so the
 * in-memory throttler counters stay isolated per file.
 */
import { createHash } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';

import { parseEnv, type Env } from '../../config/env';
import { createApp } from '../../create-app';
import { PrismaService } from '../../prisma/prisma.service';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';

/** Defaults so the suites also run on a fresh checkout without a .env file. */
export function prepareE2EEnv(): Env {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/resume_api';
  }
  if (!process.env['JWT_SECRET']) {
    process.env['JWT_SECRET'] = 'e2e-only-secret-not-for-production-0123456789';
  }
  return parseEnv(process.env);
}

export interface E2EContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function bootApp(env: Env): Promise<E2EContext> {
  const app = await createApp(env);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

export async function createE2EUser(
  prisma: PrismaService,
  email: string,
  password: string,
): Promise<string> {
  const hasher = new Argon2PasswordHasher();
  const user = await prisma.user.create({
    data: { email, passwordHash: await hasher.hash(password), role: 'ADMIN' },
  });
  return user.id;
}

export async function deleteE2EUser(prisma: PrismaService, email: string): Promise<void> {
  await prisma.user.deleteMany({ where: { email } });
}

/** Extracts the value of the refresh cookie from a `set-cookie` header entry. */
export function refreshCookieValue(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const match = /^refresh_token=([^;]*)/.exec(header ?? '');
  if (!match) {
    throw new Error(`no refresh_token cookie in set-cookie: ${String(header)}`);
  }
  return match[1];
}

/** Storage form of a refresh token (SHA-256 hex) — lets tests assert rows. */
export function sha256Hex(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Decodes a JWT payload WITHOUT verification (assertions inspect claims only). */
export function decodeJwtClaims(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}
