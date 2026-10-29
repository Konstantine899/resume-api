import { describe, expect, it } from 'vitest';

import { detectMedia, looksLikeSvg, mimeFor, RASTER_MIME } from './media-type';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const gif = Buffer.from('GIF89a-rest', 'latin1');
const webp = Buffer.concat([
  Buffer.from('RIFF', 'latin1'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBPVP8 ', 'latin1'),
]);
const avif = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x20]),
  Buffer.from('ftypavif', 'latin1'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
]);

describe('media content sniffing (plan D4)', () => {
  it('detects the raster formats sharp can decode', () => {
    expect(detectMedia(png)).toEqual({ kind: 'raster', format: 'png' });
    expect(detectMedia(jpeg)).toEqual({ kind: 'raster', format: 'jpeg' });
    expect(detectMedia(gif)).toEqual({ kind: 'raster', format: 'gif' });
    expect(detectMedia(webp)).toEqual({ kind: 'raster', format: 'webp' });
    expect(detectMedia(avif)).toEqual({ kind: 'raster', format: 'avif' });
  });

  it('detects SVG documents, including an XML prolog', () => {
    expect(detectMedia(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toEqual({
      kind: 'svg',
    });
    expect(looksLikeSvg(Buffer.from('<?xml version="1.0"?><svg></svg>'))).toBe(true);
    expect(looksLikeSvg(Buffer.from('\uFEFF  <svg></svg>'))).toBe(true);
  });

  it('returns null for unknown or empty content', () => {
    expect(detectMedia(Buffer.from('not an image'))).toBeNull();
    expect(detectMedia(Buffer.alloc(0))).toBeNull();
    // HEIC/HEIF are not decodable by the prebuilt sharp build (plan D6).
    expect(detectMedia(Buffer.from('\0\0\0\x20ftypheic', 'latin1'))).toBeNull();
  });

  it('maps detected content to the served MIME type', () => {
    expect(mimeFor({ kind: 'raster', format: 'webp' })).toBe('image/webp');
    expect(mimeFor({ kind: 'svg' })).toBe('image/svg+xml');
    expect(RASTER_MIME.avif).toBe('image/avif');
  });
});
