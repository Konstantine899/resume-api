import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  // Fail fast with a readable report before Nest creates anything.
  const env = loadEnv();

  const app = await NestFactory.create(AppModule);
  configureApp(app, env);
  await app.listen(env.PORT);
}

void bootstrap();
