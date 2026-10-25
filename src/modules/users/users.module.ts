import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { UserAccountsService } from './application/user-accounts.service';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { USER_REPOSITORY } from './users.tokens';

/**
 * Users context: owns the `User` aggregate (including the `admin` role) and
 * its storage. Exposes ONLY the application facade — no public HTTP routes
 * (SPEC users U3/U4).
 */
@Module({
  imports: [PrismaModule],
  providers: [UserAccountsService, { provide: USER_REPOSITORY, useClass: PrismaUserRepository }],
  exports: [UserAccountsService],
})
export class UsersModule {}
