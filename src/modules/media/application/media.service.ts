import { Inject, Injectable } from '@nestjs/common';

import { SafeSvg } from '../../content/domain/safe-svg';
import { MediaConflictError, MediaNotFoundError } from '../domain/media-errors';
import { allVariantKeys, parseMediaKey } from '../domain/media-key';
import { detectMedia, mimeFor } from '../domain/media-type';
import type {
  MediaKind,
  MediaObject,
  MediaProcessor,
  MediaReferences,
  MediaStorage,
} from '../domain/ports';
import { MEDIA_PROCESSOR, MEDIA_REFERENCES, MEDIA_STORAGE } from '../media.tokens';

export interface MediaUploadResult {
  key: string;
  width: number;
  height: number;
  variants: Array<{ width: number; key: string }>;
}

/**
 * Orchestrates the pipeline: validate/encode (processor), persist atomically
 * (storage), and protect referenced keys from deletion.
 */
@Injectable()
export class MediaService {
  constructor(
    @Inject(MEDIA_PROCESSOR) private readonly processor: MediaProcessor,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    @Inject(MEDIA_REFERENCES) private readonly references: MediaReferences,
  ) {}

  async upload(input: Buffer, kind: MediaKind): Promise<MediaUploadResult> {
    const processed = await this.processor.process(input, kind);
    const written: string[] = [];
    try {
      for (const file of processed.files) {
        await this.storage.put(file.key, file.data);
        written.push(file.key);
      }
    } catch (error) {
      // The upload is all-or-nothing: leftovers would never be referenced.
      await Promise.allSettled(written.map((key) => this.storage.delete(key)));
      throw error;
    }

    return {
      key: processed.key,
      width: processed.width,
      height: processed.height,
      variants: processed.variants,
    };
  }

  async get(key: string): Promise<MediaObject> {
    const parsed = parseMediaKey(key);
    if (!parsed) {
      throw new MediaNotFoundError();
    }
    const data = await this.storage.read(key);
    if (!data) {
      throw new MediaNotFoundError();
    }
    const detected = detectMedia(data);
    if (!detected) {
      throw new MediaNotFoundError();
    }
    if (detected.kind === 'svg') {
      // Defense in depth: stored SVGs are re-validated before every response.
      try {
        SafeSvg.of(data.toString('utf8'));
      } catch {
        throw new MediaNotFoundError();
      }
    }
    return { data, mime: mimeFor(detected) };
  }

  /**
   * Deletes a BASE key and every variant it could own. Variant keys are not
   * deletable directly — documents only ever store the base (plan D2).
   */
  async remove(key: string): Promise<void> {
    const parsed = parseMediaKey(key);
    if (!parsed || parsed.variantWidth !== null) {
      throw new MediaNotFoundError();
    }
    if (await this.references.isReferenced(key)) {
      throw new MediaConflictError('media is still referenced by a document');
    }

    const keys = [key, ...allVariantKeys(parsed.uuid)];
    await Promise.allSettled(keys.map((candidate) => this.storage.delete(candidate)));
  }
}
