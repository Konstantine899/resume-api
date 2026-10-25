import { Inject, Injectable, Logger } from '@nestjs/common';
import { ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface LivenessReport {
  status: 'ok';
}

export interface ReadinessReport {
  status: 'ok' | 'error';
  checks: {
    database: 'up' | 'down';
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

  // Explicit token: the test runner transforms TypeScript without
  // `emitDecoratorMetadata`, so constructor-inferred DI tokens would not
  // resolve outside of `tsc`.
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  liveness(): LivenessReport {
    return { status: 'ok' };
  }

  async readiness(): Promise<ReadinessReport> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', checks: { database: 'up' } };
    } catch (error) {
      this.logger.warn(`Database readiness check failed: ${sanitizeErrorMessage(error)}`);
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: 'down' },
      });
    }
  }
}
