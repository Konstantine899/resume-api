import { Module } from '@nestjs/common';

import { parseEnv } from '../../config/env';
import { AuthModule } from '../auth/auth.module';
import { RolesGuard } from '../content/presentation/roles.guard';
import { MediaService } from './application/media.service';
import { LocalDiskStorage } from './infrastructure/local-disk.storage';
import { PrismaMediaReferences } from './infrastructure/prisma-media-references';
import { SharpMediaProcessor } from './infrastructure/sharp.processor';
import {
  MEDIA_CONFIG,
  MEDIA_PROCESSOR,
  MEDIA_REFERENCES,
  MEDIA_STORAGE,
  type MediaConfig,
} from './media.tokens';
import { ImagesCompatController } from './presentation/images-compat.controller';
import { MediaController } from './presentation/media.controller';

/**
 * Composition root of the media context. The storage factory awaits
 * `ensureReady()`, so the uploads directory exists before the app listens
 * (readiness later re-proves writability with a probe file).
 */
@Module({
  imports: [AuthModule],
  controllers: [MediaController, ImagesCompatController],
  providers: [
    {
      provide: MEDIA_CONFIG,
      useFactory: (): MediaConfig => ({ uploadsDir: parseEnv().UPLOADS_DIR }),
    },
    {
      provide: MEDIA_STORAGE,
      useFactory: async (config: MediaConfig) => {
        const storage = new LocalDiskStorage(config.uploadsDir);
        await storage.ensureReady();
        return storage;
      },
      inject: [MEDIA_CONFIG],
    },
    { provide: MEDIA_PROCESSOR, useClass: SharpMediaProcessor },
    { provide: MEDIA_REFERENCES, useClass: PrismaMediaReferences },
    MediaService,
    RolesGuard,
  ],
  exports: [MEDIA_STORAGE],
})
export class MediaModule {}
