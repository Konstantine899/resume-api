import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import type { Env } from '../../config/env';
import {
  bootApp,
  createE2EUser,
  deleteE2EUser,
  prepareE2EEnv,
  refreshCookieValue,
  sha256Hex,
  type E2EContext,
} from './e2e-helpers';

const PASSWORD = 'correct-horse-e2e';
const EMAIL = `refresh-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let userId: string;

/** Tokens flow between the sequential rotation -> reuse assertions. */
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

/** Kept to 4 refresh calls total: the route allows 5/minute per IP (C3/C15). */
function refreshCall(cookie: string | null) {
  const call = request(ctx.app.getHttpServer()).post('/auth/refresh');
  if (cookie !== null) {
    call.set('Cookie', `refresh_token=${cookie}`);
  }
  return call;
}

describe('POST /auth/refresh — rotation (SPEC C4)', () => {
  it('mints a new cookie, flips the presented session to used, keeps the family', async () => {
    state.presented = await login();
    const response = await refreshCall(state.presented);

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(['accessToken', 'expiresIn', 'tokenType']);
    expect(response.body.expiresIn).toBe(900);
    expect(response.headers['set-cookie']).toHaveLength(1);

    state.rotated = refreshCookieValue(response.headers['set-cookie']);
    expect(state.rotated).not.toBe(state.presented);
    // Still the same hardening flags as on login (C9).
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/auth');

    const rows = await ctx.prisma.refreshSession.findMany({ where: { userId } });
    expect(rows).toHaveLength(2);
    const old = rows.find((row) => row.tokenHash === sha256Hex(state.presented));
    const next = rows.find((row) => row.tokenHash === sha256Hex(state.rotated));
    expect(old).toBeDefined();
    expect(next).toBeDefined();
    expect(old?.status).toBe('used');
    expect(old?.usedAt).not.toBeNull();
    expect(next?.status).toBe('active');
    expect(next?.familyId).toBe(old?.familyId);

    // The rotated access token is immediately usable (C1).
    const me = await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken as string}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(EMAIL);
  });
});

describe('reuse detection (SPEC C5 / invariant I4)', () => {
  it('re-presenting the rotated token answers 401 and revokes the WHOLE family', async () => {
    const response = await refreshCall(state.presented);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
    expect(response.body.detail).toBe('Invalid session');

    const rows = await ctx.prisma.refreshSession.findMany({ where: { userId } });
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.status).toBe('revoked');
      expect(row.revokedReason).toBe('reuse');
      expect(row.revokedAt).not.toBeNull();
    }
  });

  it('the successor of a revoked family is dead too', async () => {
    const response = await refreshCall(state.rotated);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
    expect(response.body.detail).toBe('Invalid session');

    const rows = await ctx.prisma.refreshSession.findMany({ where: { userId } });
    expect(rows).toHaveLength(2); // no new session was minted for the dead family
    expect(rows.every((row) => row.status === 'revoked')).toBe(true);
  });

  it('a request without the cookie gets the same generic 401', async () => {
    const response = await refreshCall(null);

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
    expect(response.body.detail).toBe('Invalid session');
  });
});
