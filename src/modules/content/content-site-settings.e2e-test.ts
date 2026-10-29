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

const PASSWORD = 'e2e-site-settings-password-123';
const EMAIL = `site-settings-e2e-${Math.random().toString(36).slice(2, 10)}@e2e.test`;

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let token: string;

beforeAll(async () => {
  ctx = await bootApp(env);
  await createE2EUser(ctx.prisma, EMAIL, PASSWORD);
  const login = await request(ctx.app.getHttpServer())
    .post('/auth/login')
    .send({ email: EMAIL, password: PASSWORD });
  token = login.body.accessToken as string;
});

afterAll(async () => {
  await deleteE2EUser(ctx.prisma, EMAIL);
  await ctx.app.close();
});

describe('GET /site/settings (public)', () => {
  it('answers 200 with { resumeUrl }', async () => {
    const response = await request(ctx.app.getHttpServer()).get('/site/settings');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('resumeUrl');
  });

  it('allows an admin to update resumeUrl', async () => {
    const updated = await request(ctx.app.getHttpServer())
      .put('/site/settings')
      .set('authorization', `Bearer ${token}`)
      .send({ resumeUrl: 'https://example.com/resume.pdf' });

    expect(updated.status).toBe(200);
    expect(updated.body.resumeUrl).toBe('https://example.com/resume.pdf');

    const fetched = await request(ctx.app.getHttpServer()).get('/site/settings');
    expect(fetched.body.resumeUrl).toBe('https://example.com/resume.pdf');
  });
});
