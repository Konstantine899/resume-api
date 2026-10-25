import { describe, expect, it } from 'vitest';

import { DeviceId } from './device-id';
import { TokenFamily } from './token-family';

describe('TokenFamily (SPEC 1.2)', () => {
  it('generates a uuid value object', () => {
    const family = TokenFamily.generate();

    expect(family.value).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('reconstitutes a valid uuid and rejects a malformed one', () => {
    const value = '2f1b7a2e-9c3d-4e5f-8a7b-1c2d3e4f5a6b';

    expect(TokenFamily.reconstitute(value).value).toBe(value);
    expect(() => TokenFamily.reconstitute('not-a-uuid')).toThrow(/not a uuid/);
  });

  it('is a value object: equality is by value', () => {
    const value = '2f1b7a2e-9c3d-4e5f-8a7b-1c2d3e4f5a6b';

    expect(TokenFamily.reconstitute(value).equals(TokenFamily.reconstitute(value))).toBe(true);
    expect(TokenFamily.reconstitute(value).equals(TokenFamily.generate())).toBe(false);
  });
});

describe('deviceId (SPEC 1.2)', () => {
  it('uses the client-provided id when present', () => {
    expect(DeviceId.create('my-device_1').value).toBe('my-device_1');
  });

  it('generates a server-side id when absent or empty (backward compatible)', () => {
    expect(DeviceId.create().value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(DeviceId.create('').value).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it('rejects ids outside 1-64 chars of [A-Za-z0-9_-]', () => {
    expect(() => DeviceId.create('has space')).toThrow(/1-64/);
    expect(() => DeviceId.create('x'.repeat(65))).toThrow(/1-64/);
    expect(() => DeviceId.create('injected;value')).toThrow(/1-64/);
  });
});
