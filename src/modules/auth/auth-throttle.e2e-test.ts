import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import type { Env } from '../../config/env';
import {
  bootApp,
  createE2EUser,
  deleteE2EUser,
  prepareE2EEnv,
  type E2EContext,
} from './e2e-helpers';

const PASSWORD = 'correct-horse-e2e';
const EMAIL = `throttle-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;
const OTHER_EMAIL = `throttle-other-${Math.random().toString(36).slice(2, 10)}@e2e.test`;

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

function loginCall(email: string, password: string) {
  return request(ctx.app.getHttpServer()).post('/auth/login').send({ email, password });
}

describe('rate limit on /auth/* (SPEC C3/C15)', () => {
  it('lets 5 logins/minute through and blocks the 6th with 429 — even with valid credentials', async () => {
    const statuses: number[] = [];
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await loginCall(EMAIL, PASSWORD);
      statuses.push(response.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200]);

    const blocked = await loginCall(EMAIL, PASSWORD);
    expect(blocked.status).toBe(429);
    expect(blocked.status).toBe(429);
    expect(blocked.body.detail).toContain('Too Many Requests');
  });

  it('keys the bucket by IP+login: a different login still gets a plain 401', async () => {
    const response = await loginCall(OTHER_EMAIL, 'definitely-wrong-password');

    expect(response.status).toBe(401);
    expect(response.body.status).toBe(401);
    expect(response.body.detail).toBe('Invalid credentials');
  });
});
