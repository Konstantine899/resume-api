import { Algorithm, hash, hashSync, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '../domain/ports';

/**
 * OWASP Password Storage Cheat Sheet profile for argon2id:
 * m = 19456 KiB (19 MiB), t = 2, p = 1.
 *
 * The constants sit RIGHT NEXT TO the hashing function (SPEC C13) and the
 * resulting PHC string embeds them next to the hash itself:
 * `$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`.
 */
export const ARGON2ID_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Prefix every hash produced by this module must start with (test vector, C13). */
export const ARGON2ID_PHC_PREFIX = '$argon2id$v=19$m=19456,t=2,p=1$';

/**
 * Fixed sentinel used to equalize the cost of a login against a nonexistent
 * account (SPEC C2 — anti enumeration). Its value is irrelevant: the result
 * of `verifyAgainstDummy` is always discarded by the caller.
 */
const DUMMY_PLAINTEXT = 'resume-api-dummy-password-for-timing';

export class Argon2PasswordHasher implements PasswordHasher {
  private dummy: string | null = null;

  hash(plain: string): Promise<string> {
    return hash(plain, ARGON2ID_OPTIONS);
  }

  verify(phcHash: string, plain: string): Promise<boolean> {
    // Parameters are read from the PHC string itself; options are not
    // repeated here so a hash can never be verified under other costs.
    return verify(phcHash, plain);
  }

  verifyAgainstDummy(plain: string): Promise<boolean> {
    return verify(this.dummyHash(), plain);
  }

  /** Computed once, lazily — a real argon2 run keeps the work profile identical. */
  private dummyHash(): string {
    this.dummy ??= hashSync(DUMMY_PLAINTEXT, ARGON2ID_OPTIONS);
    return this.dummy;
  }
}
