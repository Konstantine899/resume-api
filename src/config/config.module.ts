import { Global, Module } from '@nestjs/common';

import { loadEnv } from './env';

export const ENV_TOKEN = 'ENV';

@Global()
@Module({})
export class ConfigModule {
  /**
   * Parses the environment once via a factory provider. `loadEnv` is also
   * called explicitly in `main.ts` for fail-fast validation before Nest
   * creates the application context; re-parsing here is cheap and keeps
   * the module usable on its own (e.g. in e2e tests).
   */
  static forRoot() {
    return {
      global: true,
      module: ConfigModule,
      providers: [{ provide: ENV_TOKEN, useFactory: loadEnv }],
      exports: [ENV_TOKEN],
    };
  }
}
