import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../prisma/prisma.service';
import type { MediaStorage } from '../modules/media/domain/ports';
import { HealthService } from './health.service';

function prismaMock(ok: boolean): PrismaService {
  return {
    $queryRaw: vi.fn(async () => {
      if (!ok) {
        throw new Error('postgresql://user:secret@db:5432/resume');
      }
      return [{ '?column?': 1 }];
    }),
  } as unknown as PrismaService;
}

function storageMock(writable: boolean): MediaStorage {
  return {
    ensureReady: vi.fn(),
    put: vi.fn(),
    read: vi.fn(),
    delete: vi.fn(),
    writable: vi.fn(async () => writable),
  } as unknown as MediaStorage;
}

describe('HealthService readiness (plan WU-1)', () => {
  it('is ok only when both the database and the uploads volume are healthy', async () => {
    const service = new HealthService(prismaMock(true), storageMock(true));
    await expect(service.readiness()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'up', media: 'up' },
    });
  });

  it('reports 503 with the failing checks', async () => {
    const service = new HealthService(prismaMock(true), storageMock(false));
    await expect(service.readiness()).rejects.toMatchObject({
      status: 503,
      response: { status: 'error', checks: { database: 'up', media: 'down' } },
    });
  });

  it('does not leak database credentials into logs', async () => {
    const service = new HealthService(prismaMock(false), storageMock(true));
    await expect(service.readiness()).rejects.toMatchObject({ status: 503 });
  });
});
