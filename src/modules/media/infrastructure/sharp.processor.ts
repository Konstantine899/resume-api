import { randomUUID } from 'node:crypto';

import sharp from 'sharp';

import { SafeSvg } from '../../content/domain/safe-svg';
import {
  MediaCorruptDomainError,
  MediaPixelLimitDomainError,
  MediaTooSmallDomainError,
  UnsupportedMediaFormatError,
} from '../domain/media-errors';
import { baseMediaKey, variantMediaKey, VARIANT_WIDTHS } from '../domain/media-key';
import { detectMedia } from '../domain/media-type';
import type { MediaFile, MediaKind, MediaProcessor, ProcessedMedia } from '../domain/ports';

/** Base images keep their native width up to this cap (plan D5). */
const MAX_BASE_WIDTH = 1920;
/** Raster icons are re-encoded down to this width. */
const MAX_ICON_WIDTH = 512;
/** New portraits must be at least this wide (plan D5); no upscaling. */
const MIN_PORTRAIT_WIDTH = 960;
const LIMIT_INPUT_PIXELS = 25_000_000;
const WEBP_QUALITY = 82;
/** sharp is CPU-bound; the queue keeps memory/CPU bounded (plan §WU-1). */
const MAX_CONCURRENT_JOBS = 2;

interface EncodedImage {
  data: Buffer;
  width: number;
  height: number;
}

function mapSharpError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/pixel limit|limitInputPixels/i.test(message)) {
    throw new MediaPixelLimitDomainError(
      `image exceeds the ${LIMIT_INPUT_PIXELS / 1_000_000} MP input limit`,
    );
  }
  throw new MediaCorruptDomainError('image could not be decoded');
}

function orientedSize(metadata: sharp.Metadata): { width: number; height: number } {
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  // EXIF orientations 5–8 rotate by 90°, swapping the axes.
  const swap = (metadata.orientation ?? 1) >= 5;
  return swap ? { width: height, height: width } : { width, height };
}

function svgSize(svg: string): { width: number; height: number } {
  const viewBox = /viewBox\s*=\s*["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i.exec(svg);
  const widthAttr = /\bwidth\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(svg);
  const heightAttr = /\bheight\s*=\s*["']([\d.]+)(?:px)?["']/i.exec(svg);
  const width = widthAttr
    ? Math.round(Number(widthAttr[1]))
    : viewBox
      ? Math.round(Number(viewBox[1]))
      : MAX_ICON_WIDTH;
  const height = heightAttr
    ? Math.round(Number(heightAttr[1]))
    : viewBox
      ? Math.round(Number(viewBox[2]))
      : MAX_ICON_WIDTH;
  return { width, height };
}

/**
 * sharp adapter (plan D4/D5): magic bytes → auto-orient → pixel limit →
 * metadata strip → WebP base + variants. Every call goes through a two-slot
 * semaphore; `sharp` itself is also capped at two threads.
 */
export class SharpMediaProcessor implements MediaProcessor {
  private availableSlots = MAX_CONCURRENT_JOBS;
  private readonly waiters: Array<() => void> = [];

  constructor() {
    sharp.concurrency(MAX_CONCURRENT_JOBS);
  }

  async process(input: Buffer, kind: MediaKind): Promise<ProcessedMedia> {
    const detected = detectMedia(input);
    if (!detected) {
      throw new UnsupportedMediaFormatError('unsupported image type');
    }
    if (detected.kind === 'svg') {
      return this.withSlot(async () => this.processSvg(input, kind));
    }
    return this.withSlot(async () => this.processRaster(input, kind));
  }

  private processSvg(input: Buffer, kind: MediaKind): ProcessedMedia {
    if (kind !== 'icon') {
      throw new UnsupportedMediaFormatError('SVG is only accepted for icons');
    }
    // Throws `SafeSvgDomainError` (400) for scripting constructs or non-SVG.
    const safe = SafeSvg.of(input.toString('utf8'));
    const { width, height } = svgSize(safe.value);
    const key = baseMediaKey(randomUUID(), 'svg');
    return {
      key,
      width,
      height,
      variants: [],
      files: [{ key, data: Buffer.from(safe.value, 'utf8') }],
    };
  }

  private async processRaster(input: Buffer, kind: MediaKind): Promise<ProcessedMedia> {
    const metadata = await sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS })
      .metadata()
      .catch(mapSharpError);
    const { width, height } = orientedSize(metadata);
    if (width === 0 || height === 0) {
      throw new MediaCorruptDomainError('image could not be decoded');
    }

    const uuid = randomUUID();

    if (kind === 'icon') {
      const base = await this.encode(input, Math.min(width, MAX_ICON_WIDTH));
      return {
        key: baseMediaKey(uuid, 'webp'),
        width: base.width,
        height: base.height,
        variants: [],
        files: [{ key: baseMediaKey(uuid, 'webp'), data: base.data }],
      };
    }

    if (width < MIN_PORTRAIT_WIDTH) {
      throw new MediaTooSmallDomainError(
        `portrait must be at least ${MIN_PORTRAIT_WIDTH}px wide (got ${width}px)`,
      );
    }

    const base = await this.encode(input, Math.min(width, MAX_BASE_WIDTH));
    const files: MediaFile[] = [{ key: baseMediaKey(uuid, 'webp'), data: base.data }];
    const variants: ProcessedMedia['variants'] = [];

    for (const variantWidth of VARIANT_WIDTHS) {
      const encoded = await this.encode(input, variantWidth);
      const key = variantMediaKey(uuid, variantWidth);
      files.push({ key, data: encoded.data });
      variants.push({ width: variantWidth, key });
    }

    return {
      key: baseMediaKey(uuid, 'webp'),
      width: base.width,
      height: base.height,
      variants,
      files,
    };
  }

  private async encode(input: Buffer, width: number): Promise<EncodedImage> {
    const result = await sharp(input, { limitInputPixels: LIMIT_INPUT_PIXELS })
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true })
      .catch(mapSharpError);
    return { data: result.data, width: result.info.width, height: result.info.height };
  }

  private async withSlot<T>(work: () => Promise<T> | T): Promise<T> {
    await this.acquire();
    try {
      return await work();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.availableSlots > 0) {
      this.availableSlots -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    this.availableSlots += 1;
  }
}
