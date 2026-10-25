import { describe, expect, it } from 'vitest';

import { OpaqueTokenCodec } from './opaque-token-codec';

describe('opaque refresh token codec (SPEC C14)', () => {
  const codec = new OpaqueTokenCodec();

  it('hashes with SHA-256: stable known test vector', () => {
    // sha256("abc")
    expect(codec.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('issues 32 random bytes as base64url — never the hash itself', () => {
    const raw = codec.create();

    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(codec.create()).not.toBe(raw);
    expect(codec.hash(raw)).toMatch(/^[0-9a-f]{64}$/);
    expect(codec.hash(raw)).not.toContain(raw);
  });
});
