import { Module } from '@nestjs/common';
import * as path from 'node:path';

import { parseEnv } from '../../config/env';
import { AssetsController } from './presentation/assets.controller';

@Module({
  controllers: [AssetsController],
  providers: [
    {
      provide: 'SHARED_ASSETS_ROOT',
      useFactory: () => {
        const env = parseEnv();
        const root = path.resolve(env.SHARED_ASSETS_DIR);
        return root;
      },
    },
  ],
})
export class AssetsModule {}
