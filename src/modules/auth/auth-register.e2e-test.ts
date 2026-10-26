import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import type { Env } from '../../config/env';
import {
  bootApp,
  decodeJwtClaims,
  deleteE2EUser,
  prepareE2EEnv,
  refreshCookieValue,
  type E2EContext,
} from './e2e-helpers';

const PASSWORD = 'pass12';

const env: Env = prepareE2EEnv();
let ctx: E2EContext;

beforeAll(async () => {
  ctx = await bootApp(env);
});

afterAll(async () => {
  await ctx.app.close();
});

describe('POST /auth/register schema (SPEC C19)', () => {
  it('rejects invalid email, boundary passwords, unknown fields and role', async () => {
    const invalidEmail = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: '12345' });
    expect(invalidEmail.status).toBe(400);

    for (const password of ['1234', '1234567890123']) {
      const response = await request(ctx.app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'a@b.test', password });
      expect(response.status).toBe(400);
    }

    const unknown = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@b.test', password: '12345', extra: 'x' });
    expect(unknown.status).toBe(400);

    const role = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'a@b.test', password: '12345', role: 'admin' });
    expect(role.status).toBe(400);
  });
});

describe('POST /auth/register happy path (SPEC C20/C22)', () => {
  const email = `reg-happy-${Math.random().toString(36).slice(2)}@e2e.test`;

  afterAll(async () => {
    await deleteE2EUser(ctx.prisma, email);
  });

  it('issues tokens with role user and a refresh cookie', async () => {
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual(['accessToken', 'expiresIn', 'tokenType']);
    expect(response.body.expiresIn).toBe(900);

    const claims = decodeJwtClaims(response.body.accessToken as string);
    expect(claims['role']).toBe('user');

    const cookie = response.headers['set-cookie'];
    expect(cookie).toBeDefined();

    const me = await request(ctx.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${response.body.accessToken as string}`);
    expect(me.status).toBe(200);
    expect(me.body.role).toBe('user');

    // cookie carries a real token, never leaked in body
    expect(JSON.stringify(response.body)).not.toContain(refreshCookieValue(cookie));
  });
});

describe('POST /auth/register duplicate (SPEC C21)', () => {
  const email = `reg-dup-${Math.random().toString(36).slice(2)}@e2e.test`;

  beforeAll(async () => {
    await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD });
  });

  afterAll(async () => {
    await deleteE2EUser(ctx.prisma, email);
  });

  it('returns 409 with exact detail and stable row count', async () => {
    const before = await ctx.prisma.user.count({ where: { email } });
    const response = await request(ctx.app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD });
    const after = await ctx.prisma.user.count({ where: { email } });

    expect(response.status).toBe(409);
    expect(response.body.detail).toBe('Email is already registered');
    expect(before).toBe(1);
    expect(after).toBe(1);
  });
});
