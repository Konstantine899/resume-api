export class SafeSvgDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeSvgDomainError';
  }
}

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
    if (!/^\s*<svg[\s>]/i.test(raw)) {
      throw new SafeSvgDomainError('SafeSvg: not an svg root');
    }
    if (SafeSvg.isUnsafe(raw)) {
      throw new SafeSvgDomainError('SafeSvg: scripting detected');
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
    return false;
  }

  /** Best-effort sanitizer: removes dangerous tags/attributes in place. */
  static sanitize(raw: string): string {
    // Strip script tags whole.
    let out = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    // Strip on* attributes.
    out = out.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    // Strip javascript: urls.
    out = out.replace(/javascript:/gi, '');
    return out.trim();
  }

  toString(): string {
    return this.value;
  }
}
