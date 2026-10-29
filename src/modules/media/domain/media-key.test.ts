import { describe, expect, it } from 'vitest';

import {
  allVariantKeys,
  baseMediaKey,
  isMediaKey,
  parseMediaKey,
  variantMediaKey,
} from './media-key';

const UUID = '2f1c9a7e-4b3d-4c8f-9a1b-7d6e5f4a3b2c';

describe('media keys (plan D1/D2)', () => {
  it('parses a base key', () => {
    expect(parseMediaKey(`${UUID}.webp`)).toEqual({
      uuid: UUID,
      extension: 'webp',
      variantWidth: null,
    });
    expect(parseMediaKey(`${UUID}.svg`)?.extension).toBe('svg');
  });

  it('parses the three variant widths', () => {
    for (const width of [320, 640, 960] as const) {
      expect(parseMediaKey(`${UUID}-${width}.webp`)).toEqual({
        uuid: UUID,
        extension: 'webp',
        variantWidth: width,
      });
    }
  });

  it('rejects traversal, unknown widths and unknown extensions', () => {
    expect(parseMediaKey(`../${UUID}.webp`)).toBeNull();
    expect(parseMediaKey(`${UUID}/x.webp`)).toBeNull();
    expect(parseMediaKey(`${UUID}-9999.webp`)).toBeNull();
    expect(parseMediaKey(`${UUID}-320.png`)).toBeNull();
    expect(parseMediaKey(`${UUID}.exe`)).toBeNull();
    expect(parseMediaKey('')).toBeNull();
    expect(isMediaKey('not-a-key')).toBe(false);
  });

  it('accepts legacy readable extensions (plan D10)', () => {
    expect(parseMediaKey(`${UUID}.jpg`)?.extension).toBe('jpg');
    expect(parseMediaKey(`${UUID}.jpeg`)?.extension).toBe('jpeg');
    expect(parseMediaKey(`${UUID}.gif`)?.extension).toBe('gif');
    expect(parseMediaKey(`${UUID}.png`)?.extension).toBe('png');
  });

  it('builds base, variant and the full variant set', () => {
    expect(baseMediaKey(UUID, 'webp')).toBe(`${UUID}.webp`);
    expect(variantMediaKey(UUID, 640)).toBe(`${UUID}-640.webp`);
    expect(allVariantKeys(UUID)).toEqual([
      `${UUID}-320.webp`,
      `${UUID}-640.webp`,
      `${UUID}-960.webp`,
    ]);
  });
});
