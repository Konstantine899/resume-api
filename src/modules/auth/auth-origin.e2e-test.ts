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
const EMAIL = `origin-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let userId: string;

const state = { presented: '', rotated: '' };

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

/** 4 refresh calls total — the route allows 5/minute per IP (C3/C15). */
function refreshCall(cookie: string, headers: Record<string, string> = {}) {
  const call = request(ctx.app.getHttpServer())
    .post('/auth/refresh')
    .set('Cookie', `refresh_token=${cookie}`);
  for (const [name, value] of Object.entries(headers)) {
    call.set(name, value);
  }
  return call;
}

describe('POST /auth/refresh origin guard (SPEC C10)', () => {
  it('rejects a foreign Origin with 403 BEFORE touching the session', async () => {
    state.presented = await login();
    const response = await refreshCall(state.presented, { Origin: 'http://evil.test' });

    expect(response.status).toBe(403);
    expect(response.body.status).toBe(403);
    expect(response.body.detail).toBe('Forbidden origin');

    // No rotation happened: the presented session is still the only one, active.
    const rows = await ctx.prisma.refreshSession.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('active');
  });

  it('accepts the configured FRONTEND_ORIGIN and rotates', async () => {
    const response = await refreshCall(state.presented, { Origin: env.FRONTEND_ORIGIN });

    expect(response.status).toBe(200);
    expect(response.body.expiresIn).toBe(900);

    state.rotated = refreshCookieValue(response.headers['set-cookie']);
    expect(state.rotated).not.toBe(state.presented);
  });

  it('rejects a cross-site Sec-Fetch-Site even without an Origin header', async () => {
    const response = await refreshCall(state.rotated, { 'Sec-Fetch-Site': 'cross-site' });

    expect(response.status).toBe(403);
    expect(response.body.status).toBe(403);
    expect(response.body.detail).toBe('Forbidden origin');
  });

  it('lets non-browser clients through (no Origin, no Sec-Fetch-Site)', async () => {
    const response = await refreshCall(state.rotated);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toHaveLength(1);
  });
});
