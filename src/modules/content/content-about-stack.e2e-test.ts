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

const PASSWORD = 'e2e-about-stack-password-123';
const EMAIL = `about-stack-e2e-${randomBytes(6).toString('hex')}@e2e.test`;

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

describe('PUT/GET /about stack field (epic about-admin-sections, WU-1)', () => {
  it('round-trips stack preserving document order', async () => {
    const put = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'Stack User',
        descriptions: [{ en: 'desc', ru: 'описание' }],
        stats: {},
        ctaLabel: null,
        stack: ['react', 'nodejs', 'typescript'],
      });
    expect(put.status).toBe(200);
    expect(put.body.stack).toEqual(['react', 'nodejs', 'typescript']);

    const got = await request(ctx.app.getHttpServer()).get('/about');
    expect(got.status).toBe(200);
    expect(got.body.stack).toEqual(['react', 'nodejs', 'typescript']);
  });

  it('accepts an empty stack as an intentionally empty document field', async () => {
    const put = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'Stack User',
        descriptions: [{ en: 'desc', ru: 'описание' }],
        stats: {},
        ctaLabel: null,
        stack: [],
      });
    expect(put.status).toBe(200);
    expect(put.body.stack).toEqual([]);

    const got = await request(ctx.app.getHttpServer()).get('/about');
    expect(got.body.stack).toEqual([]);
  });

  it('rejects a non-slug stack key with 400 RFC 7807 and does not change state', async () => {
    const before = await request(ctx.app.getHttpServer()).get('/about');
    const previousStack = before.body.stack as unknown;

    const put = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'Stack User',
        descriptions: [{ en: 'desc', ru: 'описание' }],
        stats: {},
        ctaLabel: null,
        stack: ['React JS'],
      });

    expect(put.status).toBe(400);
    expect(put.body.status).toBe(400);

    const after = await request(ctx.app.getHttpServer()).get('/about');
    expect((after.body.stack as unknown) ?? undefined).toEqual(previousStack ?? undefined);
  });

  it('rejects more than 20 stack entries with 400', async () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `tech-${i}`);
    const put = await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'Stack User',
        descriptions: [{ en: 'desc', ru: 'описание' }],
        stats: {},
        ctaLabel: null,
        stack: tooMany,
      });

    expect(put.status).toBe(400);
    expect(put.body.status).toBe(400);
  });

  it('keeps a legacy document (no stack field) readable without the field', async () => {
    await resetAbout();
    await request(ctx.app.getHttpServer())
      .put('/about')
      .set('authorization', `Bearer ${token}`)
      .send({
        fullName: 'Legacy User',
        descriptions: [{ en: 'desc', ru: 'описание' }],
        stats: {},
        ctaLabel: null,
      });

    const got = await request(ctx.app.getHttpServer()).get('/about');
    expect(got.status).toBe(200);
    expect(got.body.stack).toBeUndefined();
  });
});
