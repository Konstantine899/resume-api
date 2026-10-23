import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface LiveResult {
  status: 'ok';
}

export interface ReadyResult {
  status: 'ok';
  database: 'up';
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: the process is up and serving requests. */
  live(): LiveResult {
    return { status: 'ok' };
  }

  /**
   * Readiness: 200 when the database answers `SELECT 1`, 503 otherwise.
   * No domain tables exist yet (Step 4), so a plain round-trip is the probe.
   */
  async ready(): Promise<ReadyResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      throw new HttpException(
        { statusCode: HttpStatus.SERVICE_UNAVAILABLE, status: 'error', database: 'down' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
