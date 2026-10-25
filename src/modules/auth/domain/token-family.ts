import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identity of a refresh-token family (all sessions issued from one login).
 * Value object: immutable, validated, two instances with the same uuid are
 * indistinguishable.
 */
export class TokenFamily {
  private constructor(public readonly value: string) {}

  /** Generates a fresh family id (called once per login). */
  static generate(): TokenFamily {
    return new TokenFamily(randomUUID());
  }

  /** Re-hydrates a family id loaded from storage; rejects malformed input. */
  static reconstitute(value: string): TokenFamily {
    if (!UUID_PATTERN.test(value)) {
      throw new Error(`TokenFamily: not a uuid: ${value}`);
    }
    return new TokenFamily(value);
  }

  equals(other: TokenFamily): boolean {
    return this.value === other.value;
  }
}
