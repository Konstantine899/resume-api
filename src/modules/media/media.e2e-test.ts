import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Env } from '../../config/env';
import {
  bootApp,
  createE2EUser,
  deleteE2EUser,
  prepareE2EEnv,
  type E2EContext,
} from '../auth/e2e-helpers';

const uploadsDir = mkdtempSync(join(tmpdir(), 'resume-media-e2e-'));
process.env['UPLOADS_DIR'] = uploadsDir;

const PASSWORD = 'e2e-media-password-123';
const EMAIL = `media-e2e-${randomBytes(6).toString('hex')}@e2e.test`;
const ABOUT_NAME = `Media E2E ${randomBytes(4).toString('hex')}`;

const env: Env = prepareE2EEnv();
let ctx: E2EContext;
let token: string;

function server() {
  return ctx.app.getHttpServer();
}

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 20, g: 80, b: 160 } },
  })
    .png()
    .toBuffer();
}

async function upload(
  kind: 'portrait' | 'icon' = 'portrait',
  width = 1200,
  height = 900,
): Promise<request.Response> {
  return request(server())
    .post(`/media?kind=${kind}`)
    .set('authorization', `Bearer ${token}`)
    .attach('file', await png(width, height), { filename: 'image.png', contentType: 'image/png' });
}

beforeAll(async () => {
  ctx = await bootApp(env);
  await createE2EUser(ctx.prisma, EMAIL, PASSWORD);
  const login = await request(server())
    .post('/auth/login')
    .send({ email: EMAIL, password: PASSWORD });
  token = login.body.accessToken as string;
});

afterAll(async () => {
  await ctx.prisma.aboutContent.deleteMany({ where: { fullName: ABOUT_NAME } });
  await deleteE2EUser(ctx.prisma, EMAIL);
  await ctx.app.close();
  rmSync(uploadsDir, { recursive: true, force: true });
});

describe('POST /media (plan WU-2)', () => {
  it('requires an admin token and a valid kind', async () => {
    const anonymous = await request(server())
      .post('/media?kind=portrait')
      .attach('file', await png(1200, 900), { filename: 'image.png', contentType: 'image/png' });
    expect(anonymous.status).toBe(401);

    const wrongKind = await request(server())
      .post('/media?kind=banner')
      .set('authorization', `Bearer ${token}`)
      .attach('file', await png(1200, 900), { filename: 'image.png', contentType: 'image/png' });
    expect(wrongKind.status).toBe(400);
  });

  it('returns { key, width, height, variants } and rejects portraits below 960px', async () => {
    const response = await upload();
    expect(response.status).toBe(201);
    expect(response.body.key).toMatch(/^[0-9a-f-]{36}\.webp$/);
    expect(response.body.width).toBe(1200);
    expect(response.body.height).toBe(900);
    expect(response.body.variants.map((variant: { width: number }) => variant.width)).toEqual([
      320, 640, 960,
    ]);

    const tooSmall = await upload('portrait', 900, 600);
    expect(tooSmall.status).toBe(400);
  });

  it('accepts SVG only as an icon', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/>');
    const icon = await request(server())
      .post('/media?kind=icon')
      .set('authorization', `Bearer ${token}`)
      .attach('file', svg, { filename: 'icon.svg', contentType: 'image/svg+xml' });

    expect(icon.status).toBe(201);
    expect(icon.body.key).toMatch(/\.svg$/);
    expect(icon.body.variants).toEqual([]);

    const asPortrait = await request(server())
      .post('/media?kind=portrait')
      .set('authorization', `Bearer ${token}`)
      .attach('file', svg, { filename: 'icon.svg', contentType: 'image/svg+xml' });
    expect(asPortrait.status).toBe(415);
  });
});

describe('GET /media/:key (plan D7)', () => {
  it('serves immutable WebP bytes, honours the ETag, and 404s unknown keys', async () => {
    const created = await upload();
    const key = created.body.key as string;

    const image = await request(server()).get(`/media/${key}`);
    expect(image.status).toBe(200);
    expect(image.headers['content-type']).toContain('image/webp');
    expect(image.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(image.headers['x-content-type-options']).toBe('nosniff');
    expect(image.headers.etag).toBeTruthy();

    const cached = await request(server())
      .get(`/media/${key}`)
      .set('if-none-match', image.headers.etag);
    expect(cached.status).toBe(304);

    const variant = await request(server()).get(`/media/${key.replace(/\.webp$/, '-320.webp')}`);
    expect(variant.status).toBe(200);

    expect(
      (await request(server()).get(`/media/${key.replace(/\.webp$/, '-9999.webp')}`)).status,
    ).toBe(404);
    expect((await request(server()).get('/media/..%2F..%2Fpackage.json')).status).toBe(404);
    expect((await request(server()).get('/media/not-a-key.webp')).status).toBe(404);
  });

  it('serves SVG with a sandbox CSP', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/>');
    const created = await request(server())
      .post('/media?kind=icon')
      .set('authorization', `Bearer ${token}`)
      .attach('file', svg, { filename: 'icon.svg', contentType: 'image/svg+xml' });

    const served = await request(server()).get(`/media/${created.body.key as string}`);
    expect(served.status).toBe(200);
    expect(served.headers['content-type']).toContain('image/svg+xml');
    expect(served.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
  });
});

describe('DELETE /media/:key and legacy /images shim', () => {
  it('deletes an unreferenced base key with its variants', async () => {
    const created = await upload();
    const key = created.body.key as string;
    const variantKey = key.replace(/\.webp$/, '-640.webp');

    expect(
      (await request(server()).delete(`/media/${key}`).set('authorization', `Bearer ${token}`))
        .status,
    ).toBe(204);
    expect((await request(server()).get(`/media/${key}`)).status).toBe(404);
    expect((await request(server()).get(`/media/${variantKey}`)).status).toBe(404);
  });

  it('refuses to delete a key still referenced by a document', async () => {
    const created = await upload();
    const key = created.body.key as string;
    const aboutId = `media-e2e-${randomBytes(6).toString('hex')}`;
    await ctx.prisma.aboutContent.create({
      data: { id: aboutId, fullName: ABOUT_NAME, descriptions: [], stats: {}, portrait: key },
    });

    const blocked = await request(server())
      .delete(`/media/${key}`)
      .set('authorization', `Bearer ${token}`);
    expect(blocked.status).toBe(409);
    expect((await request(server()).get(`/media/${key}`)).status).toBe(200);

    await ctx.prisma.aboutContent.deleteMany({ where: { id: aboutId } });
    expect(
      (await request(server()).delete(`/media/${key}`).set('authorization', `Bearer ${token}`))
        .status,
    ).toBe(204);
  });

  it('keeps the legacy { url, filename } shape and serves it under /images', async () => {
    const legacy = await request(server())
      .post('/images')
      .set('authorization', `Bearer ${token}`)
      .attach('file', await png(1200, 900), { filename: 'legacy.png', contentType: 'image/png' });

    expect(legacy.status).toBe(201);
    expect(legacy.body).toEqual({
      url: `/images/${legacy.body.filename}`,
      filename: legacy.body.filename,
    });

    const served = await request(server()).get(legacy.body.url as string);
    expect(served.status).toBe(200);
    expect(served.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    expect((await request(server()).delete(legacy.body.url as string)).status).toBe(401);
  });
});
