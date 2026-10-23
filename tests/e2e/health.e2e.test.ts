import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { loadEnv } from '../../src/config/env';

describe('health endpoints (smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const env = loadEnv();
    app = await NestFactory.create(AppModule, { logger: false });
    configureApp(app, env);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live → 200 with helmet headers', async () => {
    const response = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('GET /health/ready → 200 when the database answers SELECT 1', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('echoes x-request-id from the request header', async () => {
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .set('x-request-id', 'smoke-test-42')
      .expect(200);
    expect(response.headers['x-request-id']).toBe('smoke-test-42');
  });

  it('GET /docs → 404 while Swagger is disabled', async () => {
    await request(app.getHttpServer()).get('/docs').expect(404);
  });
});
