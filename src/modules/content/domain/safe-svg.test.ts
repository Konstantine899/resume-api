import { describe, expect, it } from 'vitest';

import { SafeSvg } from './safe-svg';

describe('SafeSvg', () => {
  const valid = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>';

  it('accepts clean svg', () => {
    expect(SafeSvg.of(valid).value).toContain('<svg');
  });

  it('rejects script tags', () => {
    expect(() => SafeSvg.of('<svg><script>alert(1)</script></svg>')).toThrow();
  });

  it('rejects event handlers', () => {
    expect(() => SafeSvg.of('<svg onload="alert(1)"></svg>')).toThrow();
  });

  it('rejects javascript: urls', () => {
    expect(() => SafeSvg.of('<svg><a href="javascript:alert(1)"/></svg>')).toThrow();
  });

  it('sanitize strips dangerous bits', () => {
    const out = SafeSvg.sanitize('<svg onload="alert(1)"><script>x</script></svg>');
    expect(out).not.toContain('onload');
    expect(out).not.toContain('script');
  });
});
