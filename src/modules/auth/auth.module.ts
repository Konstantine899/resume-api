import { Module } from '@nestjs/common';

import { parseEnv } from '../../config/env';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { AdminSeedService } from './application/admin-seed.service';
import { LoginUseCase } from './application/login.use-case';
import { LogoutUseCase } from './application/logout.use-case';
import { MeUseCase } from './application/me.use-case';
import { RefreshUseCase } from './application/refresh.use-case';
import {
  ACCESS_TOKEN_ISSUER,
  AUTH_CONFIG,
  CLOCK,
  PASSWORD_HASHER,
  SESSION_REPOSITORY,
  TOKEN_CODEC,
  type AuthConfig,
} from './auth.tokens';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { JwtAccessTokenIssuer } from './infrastructure/jwt-access-token-issuer';
import { OpaqueTokenCodec } from './infrastructure/opaque-token-codec';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { SystemClock } from './infrastructure/system-clock';
import { AuthController } from './presentation/auth.controller';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';
import { RefreshOriginGuard } from './presentation/origin.guard';

/**
 * Composition root of the auth context: ports (domain) are bound to their
 * infrastructure adapters here. Every constructor dependency is wired with an
 * explicit token — the test transformer does not emit `design:paramtypes`.
 */
@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_CONFIG,
      useFactory: (): AuthConfig => {
        const env = parseEnv();
        return {
          frontendOrigin: env.FRONTEND_ORIGIN,
          cookiePath: env.COOKIE_PATH,
          jwtSecret: env.JWT_SECRET,
        };
      },
    },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_CODEC, useClass: OpaqueTokenCodec },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: ACCESS_TOKEN_ISSUER,
      useFactory: (config: AuthConfig) => new JwtAccessTokenIssuer(config.jwtSecret),
      inject: [AUTH_CONFIG],
    },
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    MeUseCase,
    AdminSeedService,
    RefreshOriginGuard,
    JwtAuthGuard,
  ],
  // JwtAuthGuard is exported for Step 4: content write-endpoints reuse it.
  exports: [AdminSeedService, JwtAuthGuard],
})
export class AuthModule {}
