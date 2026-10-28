export class SafeSvgDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeSvgDomainError';
  }
}

const ALLOWED_TAG_NAMES = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'defs',
  'lineargradient',
  'radialgradient',
  'clippath',
  'pattern',
  'stop',
  'use',
  'text',
  'tspan',
  'title',
  'desc',
  'symbol',
  'marker',
  'mask',
  'filter',
  'fecolormatrix',
  'fegaussianblur',
  'feoffset',
  'femerge',
  'femergenode',
  'flood',
]);

const BLOCKED_TAG_NAMES = new Set([
  'script',
  'foreignobject',
  'iframe',
  'object',
  'embed',
  'animate',
  'set',
  'animatemotion',
  'animatetransform',
]);

/**
 * Value object wrapping an SVG string with the guarantee that no scripting
 * constructs are present (stored-XSS defense, SPEC C-1).
 */
export class SafeSvg {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static of(raw: string): SafeSvg {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      throw new SafeSvgDomainError('SafeSvg: empty svg');
    }
    if (!/^\s*<\?xml[\s\S]*?\?>\s*<svg[\s>]/i.test(raw) && !/^\s*<svg[\s>]/i.test(raw)) {
      throw new SafeSvgDomainError('SafeSvg: not an svg root');
    }
    if (/<!DOCTYPE/i.test(raw) || /<!ENTITY/i.test(raw)) {
      throw new SafeSvgDomainError('SafeSvg: doctype/entity not allowed');
    }
    if (SafeSvg.isUnsafe(raw)) {
      throw new SafeSvgDomainError('SafeSvg: scripting detected');
    }
    const first = raw.replace(/^<\?xml[\s\S]*?\?>\s*/i, '').trim();
    // strict allowlist top-level tag check
    const rootTag = first.match(/^<([a-zA-Z0-9-]+)/);
    if (!rootTag || rootTag[1].toLowerCase() !== 'svg') {
      throw new SafeSvgDomainError('SafeSvg: not an svg root');
    }
    // optionally validate top-level tags via regex (basic dynamic allowlist of child tags)
    if (!SafeSvg.allTagsAllowed(raw)) {
      throw new SafeSvgDomainError('SafeSvg: disallowed tag');
    }
    return new SafeSvg(raw.trim());
  }

  static isUnsafe(raw: string): boolean {
    const probe = raw.toLowerCase();
    if (/<script\b/i.test(probe)) return true;
    if (/\bon\w+\s*=/i.test(probe)) return true; // onload=, onclick=...
    if (/javascript:/i.test(probe)) return true;
    if (/<foreignObject\b/i.test(probe)) return true;
    if (/<iframe\b/i.test(probe)) return true;
    // External resource referrals (url(), href=http(s), data:, javascript:).
    if (/href\s*=\s*["']\s*(https?:|\/\/|data:|javascript:)/i.test(probe)) return true;
    if (/xlink:href\s*=\s*["']\s*(https?:|\/\/|data:|javascript:)/i.test(probe)) return true;
    if (/\burl\s*\(\s*["']?\s*(https?:|\/\/|data:|javascript:)/i.test(probe)) return true;
    return false;
  }

  static allTagsAllowed(raw: string): boolean {
    const tagMatches = raw.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)\b/g);
    for (const match of tagMatches) {
      const tag = (match[1] ?? '').toLowerCase();
      if (BLOCKED_TAG_NAMES.has(tag)) return false;
      if (!ALLOWED_TAG_NAMES.has(tag)) return false;
    }
    return true;
  }

  /** Best-effort sanitizer: removes dangerous tags/attributes in place. */
  static sanitize(raw: string): string {
    const out = raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    return out.trim();
  }

  toString(): string {
    return this.value;
  }
}
