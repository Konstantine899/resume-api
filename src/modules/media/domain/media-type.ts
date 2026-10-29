// Content sniffing for uploads and serving. The extension is never trusted:
// the MIME type served over HTTP comes from the bytes on disk (plan D7).

export type RasterFormat = 'png' | 'jpeg' | 'gif' | 'webp' | 'avif';

export type DetectedMedia = { kind: 'raster'; format: RasterFormat } | { kind: 'svg' };

export const RASTER_MIME: Record<RasterFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
};

export const SVG_MIME = 'image/svg+xml';

function startsWith(buffer: Buffer, bytes: readonly number[]): boolean {
  if (buffer.length < bytes.length) {
    return false;
  }
  return bytes.every((byte, index) => buffer[index] === byte);
}

function isAvif(buffer: Buffer): boolean {
  if (buffer.length < 12) {
    return false;
  }
  if (buffer.subarray(4, 8).toString('latin1') !== 'ftyp') {
    return false;
  }
  const brand = buffer.subarray(8, 12).toString('latin1');
  return brand === 'avif' || brand === 'avis';
}

/** True when the buffer starts like an SVG document (XML prolog tolerated). */
export function looksLikeSvg(buffer: Buffer): boolean {
  const head = buffer
    .subarray(0, 1024)
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();
  if (/^<svg[\s>]/i.test(head)) {
    return true;
  }
  return /^<\?xml[\s\S]*?<svg[\s>]/i.test(head);
}

export function detectMedia(buffer: Buffer): DetectedMedia | null {
  if (buffer.length === 0) {
    return null;
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'raster', format: 'png' };
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    return { kind: 'raster', format: 'jpeg' };
  }
  if (
    buffer.subarray(0, 6).toString('latin1') === 'GIF87a' ||
    buffer.subarray(0, 6).toString('latin1') === 'GIF89a'
  ) {
    return { kind: 'raster', format: 'gif' };
  }
  if (
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return { kind: 'raster', format: 'webp' };
  }
  if (isAvif(buffer)) {
    return { kind: 'raster', format: 'avif' };
  }
  if (looksLikeSvg(buffer)) {
    return { kind: 'svg' };
  }
  return null;
}

export function mimeFor(detected: DetectedMedia): string {
  return detected.kind === 'svg' ? SVG_MIME : RASTER_MIME[detected.format];
}
