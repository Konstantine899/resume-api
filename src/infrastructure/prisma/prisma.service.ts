import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { ENV_TOKEN } from '../../config/config.module';
import { type Env } from '../../config/env';
// Prisma 7 "prisma-client" generator emits TypeScript sources into
// src/generated/prisma (gitignored); the entry file is client.ts.
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Prisma 7 requires an explicit driver adapter (no built-in engine
 * connection string). Connections are opened lazily on the first query, so
 * the process can boot (and `/health/live` stays meaningful) even when the
 * database is down; `/health/ready` is the probe that actually touches it.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV_TOKEN) env: Env) {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
