// Media key contract (plan D1/D2): a document stores a flat key, never a URL.
//
// Base keys:    <uuid>.<ext>
// Variant keys: <uuid>-<width>.webp (widths 320 | 640 | 960)
//
// The allowlist is intentionally strict: only lowercase uuid v4 hex, a small
// extension set and the three variant widths survive parsing. Anything else —
// including path separators — is treated as an unknown key (404 at the edge).

export const VARIANT_WIDTHS = [320, 640, 960] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

/** Extensions a BASE key may carry. Legacy extensions stay readable (D10). */
export const BASE_EXTENSIONS = ['png', 'webp', 'avif', 'svg', 'jpg', 'jpeg', 'gif'] as const;
export type BaseExtension = (typeof BASE_EXTENSIONS)[number];

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const BASE_KEY_RE = new RegExp(`^(${UUID_PATTERN})\\.(${BASE_EXTENSIONS.join('|')})$`);
const VARIANT_KEY_RE = new RegExp(`^(${UUID_PATTERN})-(${VARIANT_WIDTHS.join('|')})\\.webp$`);

export interface ParsedMediaKey {
  uuid: string;
  extension: BaseExtension;
  /** `null` for a base key; the width for a variant key. */
  variantWidth: VariantWidth | null;
}

export function isVariantWidth(value: number): value is VariantWidth {
  return (VARIANT_WIDTHS as readonly number[]).includes(value);
}

/** Parses a base or variant key; returns `null` for anything outside the allowlist. */
export function parseMediaKey(key: string): ParsedMediaKey | null {
  const variant = VARIANT_KEY_RE.exec(key);
  if (variant) {
    return {
      uuid: variant[1],
      extension: 'webp',
      variantWidth: Number(variant[2]) as VariantWidth,
    };
  }

  const base = BASE_KEY_RE.exec(key);
  if (base) {
    return {
      uuid: base[1],
      extension: base[2] as BaseExtension,
      variantWidth: null,
    };
  }

  return null;
}

export function isMediaKey(value: string): boolean {
  return parseMediaKey(value) !== null;
}

export function baseMediaKey(uuid: string, extension: BaseExtension): string {
  return `${uuid}.${extension}`;
}

export function variantMediaKey(uuid: string, width: VariantWidth): string {
  return `${uuid}-${width}.webp`;
}

/** All variant keys of a base key, whether or not they exist on disk yet. */
export function allVariantKeys(uuid: string): string[] {
  return VARIANT_WIDTHS.map((width) => variantMediaKey(uuid, width));
}
