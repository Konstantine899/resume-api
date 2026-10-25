import { describe, expect, it } from 'vitest';

import {
  ARGON2ID_OPTIONS,
  ARGON2ID_PHC_PREFIX,
  Argon2PasswordHasher,
} from './argon2-password-hasher';

describe('argon2id OWASP profile (SPEC C13)', () => {
  const hasher = new Argon2PasswordHasher();

  it('pins the OWASP parameters: m=19456 KiB, t=2, p=1, argon2id', () => {
    expect(ARGON2ID_OPTIONS).toEqual({
      algorithm: 2, // Algorithm.Argon2id
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  });

  it('test vector: hashes carry the OWASP parameters next to the hash (PHC prefix)', async () => {
    const phc = await hasher.hash('correct-horse-battery-staple');

    expect(phc.startsWith(ARGON2ID_PHC_PREFIX)).toBe(true);
    expect(phc).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[^$]+\$[A-Za-z0-9+/=]+$/);
  });

  it('test vector: verify roundtrip (right password true, wrong password false)', async () => {
    const phc = await hasher.hash('correct-horse-battery-staple');

    await expect(hasher.verify(phc, 'correct-horse-battery-staple')).resolves.toBe(true);
    await expect(hasher.verify(phc, 'wrong-password')).resolves.toBe(false);
  });

  it('salts every hash: identical passwords never produce identical PHC strings', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('same-password'),
      hasher.hash('same-password'),
    ]);

    expect(first).not.toBe(second);
    await expect(hasher.verify(first, 'same-password')).resolves.toBe(true);
    await expect(hasher.verify(second, 'same-password')).resolves.toBe(true);
  });

  it('dummy verification (anti-enumeration) fails for arbitrary user input', async () => {
    // The result is discarded by LoginUseCase anyway — the point is that the
    // call costs a real argon2 verification for unknown accounts.
    await expect(hasher.verifyAgainstDummy('anything')).resolves.toBe(false);
    await expect(hasher.verifyAgainstDummy('')).resolves.toBe(false);
  });
});
