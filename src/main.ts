import { Logger } from '@nestjs/common';

import { validateEnv } from './config/env';
import { createApp } from './create-app';

/**
 * Entry point. Environment validation runs BEFORE the Nest application is
 * created: an invalid configuration must stop the process, not the app.
 */
export async function bootstrap(): Promise<void> {
  const env = validateEnv();
  const app = await createApp(env);

  await app.listen(env.PORT);
  new Logger('Bootstrap').log(`Listening on http://localhost:${env.PORT}`);
}

bootstrap().catch((error: unknown) => {
  console.error('[resume-api] Fatal error during bootstrap:', error);
  process.exit(1);
});
