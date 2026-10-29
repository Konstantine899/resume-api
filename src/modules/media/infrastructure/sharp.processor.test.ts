import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  MediaCorruptDomainError,
  MediaPixelLimitDomainError,
  MediaTooSmallDomainError,
  UnsupportedMediaFormatError,
} from '../domain/media-errors';
import { SharpMediaProcessor } from './sharp.processor';

const processor = new SharpMediaProcessor();

async function raster(
  width: number,
  height: number,
  format: 'png' | 'jpeg' = 'png',
): Promise<Buffer> {
  const pipeline = sharp({
    create: { width, height, channels: 3, background: { r: 51, g: 102, b: 153 } },
  });
  return format === 'png' ? pipeline.png().toBuffer() : pipeline.jpeg().toBuffer();
}

describe('SharpMediaProcessor (plan D4/D5)', () => {
  it('produces a WebP base plus 320/640/960 variants for a portrait', async () => {
    const result = await processor.process(await raster(1200, 900), 'portrait');

    expect(result.key).toMatch(/^[0-9a-f-]{36}\.webp$/);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
    expect(result.variants.map((variant) => variant.width)).toEqual([320, 640, 960]);
    expect(result.files).toHaveLength(4);

    for (const variant of result.variants) {
      expect(variant.key).toBe(`${result.key.replace(/\.webp$/, '')}-${variant.width}.webp`);
      const file = result.files.find((candidate) => candidate.key === variant.key);
      expect(file).toBeDefined();
      const meta = await sharp(file!.data).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.width).toBe(variant.width);
    }

    const base = result.files.find((file) => file.key === result.key)!;
    const baseMeta = await sharp(base.data).metadata();
    expect(baseMeta.format).toBe('webp');
    expect(baseMeta.width).toBe(1200);
    // Metadata strip: no EXIF/XMP survives the pipeline.
    expect(baseMeta.exif).toBeUndefined();
    expect(baseMeta.xmp).toBeUndefined();
  });

  it('caps a new base at 1920px without upscaling', async () => {
    const result = await processor.process(await raster(3000, 2000), 'portrait');
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1280);
    expect(result.variants).toHaveLength(3);
  });

  it('rejects a portrait narrower than 960px', async () => {
    await expect(processor.process(await raster(900, 600), 'portrait')).rejects.toBeInstanceOf(
      MediaTooSmallDomainError,
    );
  });

  it('applies EXIF orientation before measuring the width', async () => {
    const input = await sharp({
      create: { width: 900, height: 1200, channels: 3, background: '#336699' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await processor.process(input, 'portrait');
    expect(result.width).toBe(1200);
    expect(result.height).toBe(900);
  });

  it('re-encodes raster icons once, capped at 512px, without variants', async () => {
    const result = await processor.process(await raster(800, 600), 'icon');
    expect(result.width).toBe(512);
    expect(result.height).toBe(384);
    expect(result.variants).toEqual([]);
    expect(result.files).toHaveLength(1);
  });

  it('accepts SVG only as an icon, after SafeSvg, and keeps it as .svg', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"/>');

    const icon = await processor.process(svg, 'icon');
    expect(icon.key).toMatch(/^[0-9a-f-]{36}\.svg$/);
    expect(icon.width).toBe(120);
    expect(icon.height).toBe(80);
    expect(icon.variants).toEqual([]);

    await expect(processor.process(svg, 'portrait')).rejects.toBeInstanceOf(
      UnsupportedMediaFormatError,
    );
  });

  it('rejects SVG scripting constructs', async () => {
    const unsafe = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    );
    await expect(processor.process(unsafe, 'icon')).rejects.toThrow(/SafeSvg/);
  });

  it('returns 415 semantics for unknown bytes and 400 for corrupt PNGs', async () => {
    await expect(processor.process(Buffer.from('nope'), 'portrait')).rejects.toBeInstanceOf(
      UnsupportedMediaFormatError,
    );

    const corrupt = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('broken'),
    ]);
    await expect(processor.process(corrupt, 'portrait')).rejects.toBeInstanceOf(
      MediaCorruptDomainError,
    );
  });

  it('rejects images above the 25 MP input limit', async () => {
    const huge = await sharp({
      create: { width: 5001, height: 5001, channels: 3, background: '#000000' },
    })
      .jpeg()
      .toBuffer();
    await expect(processor.process(huge, 'portrait')).rejects.toBeInstanceOf(
      MediaPixelLimitDomainError,
    );
  }, 30_000);
});
