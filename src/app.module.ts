import 'reflect-metadata';

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { ConfigModule, ENV_TOKEN } from './config/config.module';
import { type Env } from './config/env';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRootAsync({
      inject: [ENV_TOKEN],
      useFactory: (env: Env) => ({
        pinoHttp: {
          level: env.LOG_LEVEL,
          // Never let credentials leak into logs: the well-known request /
          // response headers plus any `password` / `token` / `secret` key at
          // the top level of a logged object.
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
              '*.password',
              '*.token',
              '*.secret',
            ],
            censor: '[REDACTED]',
          },
          // Echo the inbound x-request-id (or mint one) and propagate it to
          // the response header so clients can correlate logs and replies.
          // pino-http does NOT set the response header by default.
          genReqId: (
            req: { headers: Record<string, string | string[] | undefined> },
            res: { setHeader(name: string, value: string): void },
          ) => {
            const inbound = req.headers['x-request-id'];
            const id = (Array.isArray(inbound) ? inbound[0] : inbound) ?? crypto.randomUUID();
            res.setHeader('x-request-id', id);
            return id;
          },
        },
      }),
    }),
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
