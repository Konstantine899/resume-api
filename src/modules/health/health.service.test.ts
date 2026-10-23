import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let queryRaw: ReturnType<typeof vi.fn>;
  let service: HealthService;

  beforeEach(() => {
    queryRaw = vi.fn();
    service = new HealthService({ $queryRaw: queryRaw } as unknown as PrismaService);
  });

  describe('live', () => {
    it('returns ok without touching the database', () => {
      expect(service.live()).toEqual({ status: 'ok' });
      expect(queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('returns 200 payload when SELECT 1 succeeds', async () => {
      queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      await expect(service.ready()).resolves.toEqual({ status: 'ok', database: 'up' });
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });

    it('throws 503 when the database is unreachable', async () => {
      queryRaw.mockRejectedValue(new Error('connection refused'));
      const error = await service.ready().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect((error as HttpException).getResponse()).toEqual({
        statusCode: 503,
        status: 'error',
        database: 'down',
      });
    });
  });
});
