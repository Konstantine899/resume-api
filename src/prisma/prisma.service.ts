import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const connectionString = process.env['DATABASE_URL'];
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  /**
   * The connection is opened lazily on the first query: a database that is
   * temporarily down must surface as `/health/ready` -> 503, not as a
   * crash-looping process.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
