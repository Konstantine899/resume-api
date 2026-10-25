import { describe, expect, it } from 'vitest';

import { LocalizedText } from './localized-text';

describe('LocalizedText', () => {
  it('creates when both locales non-empty', () => {
    const v = LocalizedText.of({ en: 'hello', ru: 'привет' });
    expect(v.en).toBe('hello');
    expect(v.ru).toBe('привет');
  });

  it('rejects empty locale', () => {
    expect(() => LocalizedText.of({ en: '', ru: 'x' })).toThrow();
    expect(() => LocalizedText.of({ en: 'x', ru: '   ' })).toThrow();
  });

  it('round-trips JSON', () => {
    const v = LocalizedText.of({ en: 'a', ru: 'б' });
    const restored = LocalizedText.fromJSON(v.toJSON());
    expect(restored.equals(v)).toBe(true);
  });
});
