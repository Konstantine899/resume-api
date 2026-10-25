import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import type { Env } from '../../config/env';
import {
  bootApp,
  createE2EUser,
  deleteE2EUser,
  prepareE2EEnv,
  refreshCookieValue,
  type E2EContext,
} from './e2e-helpers';

const PASSWORD = 'correct-horse-e2e';
const EMAIL = `logout-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let userId: string;

const state = { presented: '' };

beforeAll(async () => {
  ctx = await bootApp(env);
  userId = await createE2EUser(ctx.prisma, EMAIL, PASSWORD);
});

afterAll(async () => {
  await deleteE2EUser(ctx.prisma, EMAIL);
  await ctx.app.close();
});

async function login(): Promise<string> {
  const response = await request(ctx.app.getHttpServer())
    .post('/auth/login')
    .send({ email: EMAIL, password: PASSWORD });
  expect(response.status).toBe(200);
  return refreshCookieValue(response.headers['set-cookie']);
}

function logoutCall(cookie: string | null) {
  const call = request(ctx.app.getHttpServer()).post('/auth/logout');
  if (cookie !== null) {
    call.set('Cookie', `refresh_token=${cookie}`);
  }
  return call;
}

function refreshCall(cookie: string) {
  return request(ctx.app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', `refresh_token=${cookie}`);
}

describe('POST /auth/logout (SPEC C8)', () => {
  it('answers 204, clears the cookie and revokes the whole family', async () => {
    state.presented = await login();
    const response = await logoutCall(state.presented);

    expect(response.status).toBe(204);

    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toHaveLength(1);
    const cleared = setCookie[0];
    expect(cleared.startsWith('refresh_token=;')).toBe(true); // value wiped
    expect(cleared).toContain('Path=/auth');
    expect(cleared).toContain('HttpOnly');
    expect(cleared).toContain('SameSite=Lax');
    expect(cleared).toContain('Secure');
    // Expiry in the past (Express spells it either way) so the browser drops it.
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);

    const rows = await ctx.prisma.refreshSession.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('revoked');
    expect(rows[0].revokedReason).toBe('logout');
    expect(rows[0].revokedAt).not.toBeNull();
  });

  it('the revoked family cannot refresh afterwards', async () => {
    const response = await refreshCall(state.presented);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ statusCode: 401, message: 'Invalid session' });
  });

  it('is idempotent: without a cookie and with a garbage cookie it still answers 204', async () => {
    const withoutCookie = await logoutCall(null);
    expect(withoutCookie.status).toBe(204);

    const garbage = await logoutCall('not-a-real-refresh-token');
    expect(garbage.status).toBe(204);

    const rows = await ctx.prisma.refreshSession.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('revoked');
  });
});

describe('unknown refresh token (SPEC C6)', () => {
  it('an opaque token that never existed is the same generic 401', async () => {
    const response = await refreshCall('never-issued-opaque-token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ statusCode: 401, message: 'Invalid session' });
  });
});
