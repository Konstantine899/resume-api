import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import type { Env } from '../../config/env';
import {
  bootApp,
  createE2EUser,
  decodeJwtClaims,
  deleteE2EUser,
  prepareE2EEnv,
  refreshCookieValue,
  type E2EContext,
} from './e2e-helpers';

const PASSWORD = 'correct-horse-e2e';
const EMAIL = `login-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;
const GHOST_EMAIL = `ghost-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;

const env: Env = prepareE2EEnv();
let ctx: E2EContext;

beforeAll(async () => {
  ctx = await bootApp(env);
  await createE2EUser(ctx.prisma, EMAIL, PASSWORD);
});

afterAll(async () => {
  await deleteE2EUser(ctx.prisma, EMAIL);
  await ctx.app.close();
});

describe('POST /auth/login (SPEC C1/C2/C9)', () => {
  it('answers 200 with access in the body and an httpOnly refresh cookie', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(['accessToken', 'expiresIn', 'tokenType']);
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.expiresIn).toBe(900);

    const claims = decodeJwtClaims(response.body.accessToken as string);
    expect(claims['sub']).toBeDefined();
    expect(claims['role']).toBe('admin');
    expect(claims['typ']).toBe('access');
    expect((claims['exp'] as number) - (claims['iat'] as number)).toBe(900);

    // Cookie flags (C9): HttpOnly + SameSite=Lax + Secure + scoped path.
    const setCookie = response.headers['set-cookie'];
    expect(setCookie).toHaveLength(1);
    const cookie = setCookie[0];
    expect(cookie).toContain('refresh_token=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/auth');
    expect(cookie).toContain('Max-Age=2592000');
    // The refresh token is NOT part of the body (memory-only access + cookie).
    expect(JSON.stringify(response.body)).not.toContain(
      refreshCookieValue(response.headers['set-cookie']),
    );
  });

  it('C2: unknown account and wrong password give the IDENTICAL status and body', async () => {
    const unknown = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: GHOST_EMAIL, password: PASSWORD });
    const wrongPassword = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: 'definitely-wrong' });

    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknown.body).toEqual(wrongPassword.body);
    expect(unknown.body.status).toBe(401);
    expect(unknown.body.detail).toBe('Invalid credentials');
    // No hint about the account's existence anywhere in the payload.
    expect(JSON.stringify(unknown.body)).not.toMatch(/exist|not found|user/i);
  });

  it('rejects malformed bodies (strict schema, defense in depth)', async () => {
    const missingPassword = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL });
    const smuggledField = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD, role: 'admin' });

    expect(missingPassword.status).toBe(400);
    expect(missingPassword.body.detail).toBe('Validation failed');
    expect(smuggledField.status).toBe(400);
    expect(smuggledField.body.detail).toBe('Validation failed');
  });
});

describe('public registration gate (SPEC C12)', () => {
  it('POST /auth/register is available when the gate is enabled', async () => {
    const email = `register-smoke-${Math.random().toString(36).slice(2)}@e2e.test`;
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: '12345' });

    expect(response.status).toBe(200);
    await deleteE2EUser(ctx.prisma, email);
  });
});

describe('GET /auth/me + JwtAuthGuard (SPEC C16)', () => {
  it('401 without Authorization, 401 with garbage, 200 with a valid access token', async () => {
    const anonymous = await request(ctx.app.getHttpServer()).get('/auth/me');
    expect(anonymous.status).toBe(401);

    const garbage = await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(garbage.status).toBe(401);
    expect(garbage.body).toEqual(anonymous.body);

    const login = await request(ctx.app.getHttpServer())
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);

    const me = await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken as string}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(EMAIL);
    expect(me.body.role).toBe('admin');
    expect(me.body.id).toBeDefined();
  });
});

describe('CORS allowlist (SPEC C11)', () => {
  it('echoes the configured origin and never a foreign one', async () => {
    const allowed = await request(ctx.app.getHttpServer())
      .get('/health/live')
      .set('Origin', env.FRONTEND_ORIGIN);
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe(env.FRONTEND_ORIGIN);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const foreign = await request(ctx.app.getHttpServer())
      .get('/health/live')
      .set('Origin', 'http://evil.test');
    expect(foreign.status).toBe(200);
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
    expect(foreign.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
