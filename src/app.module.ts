import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModule,
  getOptionsToken,
  getStorageToken,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';

import { HealthModule } from './health/health.module';
import { Rfc7807ExceptionFilter } from './rfc7807-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { MediaModule } from './modules/media/media.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    AuthModule,
    ContentModule,
    MediaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: Rfc7807ExceptionFilter },
    {
      provide: APP_GUARD,
      useFactory: (
        options: ThrottlerModuleOptions,
        storage: ThrottlerStorage,
        reflector: Reflector,
      ) => new ThrottlerGuard(options, storage, reflector),
      inject: [getOptionsToken(), getStorageToken(), Reflector],
    },
  ],
})
export class AppModule {}
