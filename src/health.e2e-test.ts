import { resolve } from 'node:path';

import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parseEnv, type Env } from './config/env';
import { createApp } from './create-app';

// Test-only credentials: the suite talks to the docker-compose database.
if (!process.env['DATABASE_URL']) {
  process.env['DATABASE_URL'] = 'postgresql://postgres:postgres@localhost:5432/resume_api';
}
if (!process.env['JWT_SECRET']) {
  process.env['JWT_SECRET'] = 'e2e-only-secret-not-for-production-0123456789';
}

const env: Env = parseEnv(process.env);

let app: INestApplication;

async function createIsolatedApp(overrides: Partial<NodeJS.ProcessEnv>): Promise<INestApplication> {
  return createApp(parseEnv({ ...process.env, ...overrides }));
}

beforeAll(async () => {
  app = await createApp(env);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('health endpoints', () => {
  it('GET /health/live answers 200 without leaking versions or environment', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(Object.keys(response.body)).toEqual(['status']);
    expect(JSON.stringify(response.body)).not.toMatch(
      /version|node|npm|production|development|24\.|0\.1\.0/i,
    );
  });

  it('GET /health/ready answers 200 when the database answers SELECT 1', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', checks: { database: 'up', media: 'up' } });
  });

  it('returns a correlation id and security headers on every response', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeTruthy();
  });

  it('propagates an inbound correlation id', async () => {
    const correlationId = 'corr-id-from-client';

    const response = await request(app.getHttpServer())
      .get('/health/live')
      .set('x-request-id', correlationId);

    expect(response.headers['x-request-id']).toBe(correlationId);
  });
});

describe('swagger gating', () => {
  it('does not serve /docs or /openapi.json when the flag is off', async () => {
    const undocumented = await createIsolatedApp({ SWAGGER_ENABLED: 'false' });

    expect((await request(undocumented.getHttpServer()).get('/docs')).status).toBe(404);
    expect((await request(undocumented.getHttpServer()).get('/openapi.json')).status).toBe(404);

    await undocumented.close();
  });

  it('serves /docs and /openapi.json when the flag is on outside production', async () => {
    const documented = await createIsolatedApp({ SWAGGER_ENABLED: 'true' });

    expect((await request(documented.getHttpServer()).get('/docs')).status).toBe(200);
    const spec = await request(documented.getHttpServer()).get('/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body).toHaveProperty('openapi');
    expect(spec.body.paths).toHaveProperty('/health/live');

    await documented.close();
  });

  it('keeps swagger off in production even with the flag on', async () => {
    const production = await createIsolatedApp({
      SWAGGER_ENABLED: 'true',
      NODE_ENV: 'production',
      UPLOADS_DIR: resolve('uploads'),
    });

    expect((await request(production.getHttpServer()).get('/docs')).status).toBe(404);
    expect((await request(production.getHttpServer()).get('/openapi.json')).status).toBe(404);

    await production.close();
  });
});
