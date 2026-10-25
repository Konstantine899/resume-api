import type { RefreshSession } from './refresh-session';
import type { AccessTokenClaims, TokenRole } from './token-claims';

/**
 * Ports of the auth context. Implementations live in `infrastructure/`;
 * the domain and application layers depend only on these interfaces.
 */

export interface SessionRepository {
  findByTokenHash(tokenHash: string): Promise<RefreshSession | null>;
  findFamily(familyId: string): Promise<RefreshSession[]>;
  /** Sessions of one device still in `active` state (used by login, invariant I-family). */
  findActiveByDevice(userId: string, deviceId: string): Promise<RefreshSession[]>;
  save(session: RefreshSession): Promise<void>;
  saveAll(sessions: RefreshSession[]): Promise<void>;
  /**
   * Conditional transition active -> used (guards against two parallel
   * refreshes of the same token). Returns false when the row was not
   * `active` anymore — the caller treats that as reuse.
   */
  markActiveUsed(id: string, now: Date): Promise<boolean>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(phcHash: string, plain: string): Promise<boolean>;
  /**
   * Constant-work verification target used when the account does not exist,
   * so "unknown user" and "wrong password" cost the same (anti enumeration).
   */
  verifyAgainstDummy(plain: string): Promise<boolean>;
}

export interface RefreshTokenCodec {
  /** Fresh opaque refresh token (never stored in raw form). */
  create(): string;
  /** SHA-256 hex — the only representation that reaches storage and logs. */
  hash(raw: string): string;
}

export interface AccessTokenIssuer {
  sign(input: { sub: string; role: TokenRole }): string;
  verify(token: string): AccessTokenClaims;
}

export interface Clock {
  now(): Date;
}
