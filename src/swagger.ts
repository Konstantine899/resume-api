import { HttpStatus } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Env } from './config/env';

/** Keep in sync with `package.json` → `version`. */
const OPENAPI_VERSION = '0.1.0';

const DOCS_PATH = 'docs';
const OPENAPI_JSON_PATH = '/openapi.json';

function isSwaggerEnabled(env: Env): boolean {
  return env.SWAGGER_ENABLED && env.NODE_ENV !== 'production';
}

/**
 * Swagger is opt-in and never served in production: without `SWAGGER_ENABLED`
 * (or in `NODE_ENV=production`) neither `/docs` nor `/openapi.json` is
 * registered, so both fall through to a plain 404.
 */
export function setupSwagger(app: INestApplication, env: Env): void {
  if (!isSwaggerEnabled(env)) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('resume-api')
    .setDescription('Backend API for the personal portfolio app')
    .setVersion(OPENAPI_VERSION)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup(DOCS_PATH, app, document);
  app.use(OPENAPI_JSON_PATH, (_req: IncomingMessage, res: ServerResponse) => {
    res.statusCode = HttpStatus.OK;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(document));
  });
}
