import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';

import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { AppModule } from './app.module';
import type { Env } from './config/env';
import { PinoLoggerAdapter } from './logger/pino-logger.adapter';
import { createPinoOptions, createRootLogger, genReqId, readRequestId } from './logger/pino';
import { setupSwagger } from './swagger';

/**
 * Builds (but does not listen on) the Nest application.
 * Shared by `main.ts` (production bootstrap) and the e2e tests.
 */
export async function createApp(env: Env): Promise<INestApplication> {
  const logger = createRootLogger(env);
  const app = await NestFactory.create(AppModule, {
    logger: new PinoLoggerAdapter(logger),
  });

  app.use(helmet());
  // CORS allowlist: exactly the frontend origin from env, cookies allowed
  // (SPEC C11); any other origin simply never receives the ACAO header.
  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (
        err: Error | null,
        origin?: boolean | string | RegExp | (string | RegExp)[],
      ) => void,
    ): void => {
      if (!requestOrigin || requestOrigin === env.FRONTEND_ORIGIN) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });
  app.use(pinoHttp({ ...createPinoOptions(env), genReqId }));
  // Echo the correlation id so clients can tie a response to its log lines.
  app.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const requestId = readRequestId(req);
    if (requestId) {
      res.setHeader('x-request-id', requestId);
    }
    next();
  });

  app.enableShutdownHooks();
  setupSwagger(app, env);

  return app;
}
