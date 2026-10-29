import { Inject, Injectable, Logger } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { MediaStorage } from '../modules/media/domain/ports';
import { MEDIA_STORAGE } from '../modules/media/media.tokens';

export interface LivenessReport {
  status: 'ok';
}

export interface ReadinessReport {
  status: 'ok' | 'error';
  checks: {
    database: 'up' | 'down';
    media: 'up' | 'down';
  };
}

const CONNECTION_STRING_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s@]+@[^\s@]+/gi;

/**
 * Prisma error messages can echo the connection string; strip credentials so a
 * failed ping never leaks the database password into the logs.
 */
function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(CONNECTION_STRING_PATTERN, '[redacted-connection-string]');
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  // Explicit tokens: the test runner transforms TypeScript without
  // `emitDecoratorMetadata`, so constructor-inferred DI tokens would not
  // resolve outside of `tsc`.
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MEDIA_STORAGE) private readonly mediaStorage: MediaStorage,
  ) {}

  liveness(): LivenessReport {
    return { status: 'ok' };
  }

  async readiness(): Promise<ReadinessReport> {
    let database: 'up' | 'down' = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch (error) {
      this.logger.warn(`Database readiness check failed: ${sanitizeErrorMessage(error)}`);
    }

    // Plan WU-1: readiness proves the uploads volume accepts a write, not just
    // that the directory exists.
    let media: 'up' | 'down' = 'down';
    try {
      media = (await this.mediaStorage.writable()) ? 'up' : 'down';
    } catch (error) {
      this.logger.warn(`Media readiness check failed: ${sanitizeErrorMessage(error)}`);
    }

    const checks = { database, media } as const;
    if (checks.database === 'up' && checks.media === 'up') {
      return { status: 'ok', checks };
    }
    throw new ServiceUnavailableException({ status: 'error', checks });
  }
}
