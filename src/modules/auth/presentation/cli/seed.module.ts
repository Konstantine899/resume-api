import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth.module';

/**
 * Minimal module graph for `npm run seed:admin`: the seed use-case plus its
 * users/Prisma dependencies, without booting the HTTP server.
 */
@Module({
  imports: [AuthModule],
})
export class SeedModule {}
