/**
 * Domain events of the auth context. They carry identifiers only — tokens,
 * token hashes and passwords never appear in events or in logs.
 */

/** Why a session family died. */
export type RevocationReason = 'reuse' | 'logout' | 'replaced' | 'expired';

/** Raised by `RefreshSession.rotate()` when an active session is consumed. */
export interface TokenRotated {
  type: 'TokenRotated';
  sessionId: string;
  familyId: string;
  userId: string;
  rotatedAt: Date;
}

/**
 * Raised by `RefreshSession.revoke()` on each transition to `revoked`.
 * The application consumer deduplicates by `familyId` and logs once per
 * family (see application/family-revocation.ts).
 */
export interface TokenFamilyRevoked {
  type: 'TokenFamilyRevoked';
  familyId: string;
  userId: string;
  reason: RevocationReason;
  revokedAt: Date;
}

export type AuthDomainEvent = TokenRotated | TokenFamilyRevoked;
