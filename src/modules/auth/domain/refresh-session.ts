import { randomUUID } from 'node:crypto';

import { DeviceId } from './device-id';
import { InvariantViolationError } from './errors';
import type { RevocationReason, TokenFamilyRevoked, TokenRotated } from './events';
import { TokenFamily } from './token-family';

export type SessionStatus = 'active' | 'used' | 'revoked';

interface RefreshSessionProps {
  id: string;
  familyId: TokenFamily;
  userId: string;
  deviceId: DeviceId;
  /** SHA-256 hex of the refresh token — the raw token never enters the aggregate. */
  tokenHash: string;
  status: SessionStatus;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: RevocationReason | null;
}

interface IssueProps {
  familyId: TokenFamily;
  userId: string;
  deviceId: DeviceId;
  tokenHash: string;
  expiresAt: Date;
  id?: string;
  createdAt?: Date;
}

/**
 * Aggregate root of the auth context (SPEC §1.1).
 *
 * State machine: active -> used (rotation) / revoked (reuse, logout,
 * replaced, expired); used -> revoked; revoked is terminal.
 * All invariants live here — storage only carries the resulting state.
 */
export class RefreshSession {
  private readonly props: RefreshSessionProps;

  private constructor(props: RefreshSessionProps) {
    this.props = props;
  }

  /** Issues a brand-new, `active` session inside an existing family. */
  static issue(props: IssueProps): RefreshSession {
    return new RefreshSession({
      id: props.id ?? randomUUID(),
      familyId: props.familyId,
      userId: props.userId,
      deviceId: props.deviceId,
      tokenHash: props.tokenHash,
      status: 'active',
      expiresAt: props.expiresAt,
      createdAt: props.createdAt ?? new Date(),
      usedAt: null,
      revokedAt: null,
      revokedReason: null,
    });
  }

  /** Re-hydrates a row loaded from storage (no events are replayed). */
  static reconstitute(props: RefreshSessionProps): RefreshSession {
    return new RefreshSession(props);
  }

  get id(): string {
    return this.props.id;
  }

  get familyId(): TokenFamily {
    return this.props.familyId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get deviceId(): DeviceId {
    return this.props.deviceId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get status(): SessionStatus {
    return this.props.status;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get revokedReason(): RevocationReason | null {
    return this.props.revokedReason;
  }

  isExpired(now: Date): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  /**
   * I1 — rotation: only an `active`, not-yet-expired session may be consumed.
   * Transitions to `used` and raises `TokenRotated`. The successor session is
   * created by the caller via `RefreshSession.issue()` in the same family.
   */
  rotate(now: Date): TokenRotated {
    if (this.props.status !== 'active') {
      throw new InvariantViolationError(
        `I1: cannot rotate a ${this.props.status} session (only active)`,
      );
    }
    if (this.isExpired(now)) {
      throw new InvariantViolationError('I1: cannot rotate an expired session');
    }
    this.props.status = 'used';
    this.props.usedAt = now;
    return {
      type: 'TokenRotated',
      sessionId: this.props.id,
      familyId: this.props.familyId.value,
      userId: this.props.userId,
      rotatedAt: now,
    };
  }

  /**
   * I2 — revocation: allowed from `active` and `used`, idempotent, and
   * terminal: a revoked session never leaves the state. Raises
   * `TokenFamilyRevoked` only on an actual transition (so the application
   * can log one event per family without noise).
   */
  revoke(reason: RevocationReason, now: Date): TokenFamilyRevoked | null {
    if (this.props.status === 'revoked') {
      return null;
    }
    this.props.status = 'revoked';
    this.props.revokedAt = now;
    this.props.revokedReason = reason;
    return {
      type: 'TokenFamilyRevoked',
      familyId: this.props.familyId.value,
      userId: this.props.userId,
      reason,
      revokedAt: now,
    };
  }
}
