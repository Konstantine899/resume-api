import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { type Env } from './config/env';

/**
 * Shared HTTP wiring between `main.ts` (production bootstrap) and the e2e
 * smoke tests, so tests exercise the same helmet / Swagger setup.
 */
export function configureApp(app: INestApplication, env: Env): INestApplication {
  app.use(helmet());

  // Swagger is gated twice on purpose: the explicit flag AND a
  // non-production NODE_ENV. In production /docs answers 404 regardless of
  // the flag value.
  if (env.SWAGGER_ENABLED && env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('resume-api')
      .setDescription('Backend API for personal portfolio')
      .setVersion('0.1.0')
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  return app;
}
