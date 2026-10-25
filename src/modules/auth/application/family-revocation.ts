import type { RevocationReason, TokenFamilyRevoked } from '../domain/events';
import type { RefreshSession } from '../domain/refresh-session';
import type { SessionRepository } from '../domain/ports';

/**
 * Revokes the sessions handed in and returns the domain events (one per
 * transitioned session; already-revoked sessions are idempotent no-ops).
 */
export function revokeSessions(
  sessions: RefreshSession[],
  reason: RevocationReason,
  now: Date,
): TokenFamilyRevoked[] {
  const events: TokenFamilyRevoked[] = [];
  for (const session of sessions) {
    const event = session.revoke(reason, now);
    if (event) {
      events.push(event);
    }
  }
  return events;
}

/**
 * Loads a whole family by id and revokes every session (I4 / logout /
 * replaced / expired). Returns the events; the caller logs them ONCE per
 * family (SPEC 1.3 — dedup by familyId).
 */
export async function revokeFamily(
  repository: SessionRepository,
  familyId: string,
  reason: RevocationReason,
  now: Date,
): Promise<TokenFamilyRevoked[]> {
  const sessions = await repository.findFamily(familyId);
  const events = revokeSessions(sessions, reason, now);
  if (events.length > 0) {
    await repository.saveAll(sessions);
  }
  return events;
}

/**
 * Log line for a family revocation — identifiers only, never token material
 * (SPEC C18). Returns null when nothing was revoked.
 */
export function describeFamilyRevocations(events: TokenFamilyRevoked[]): string | null {
  if (events.length === 0) {
    return null;
  }
  const first = events[0];
  return `TokenFamilyRevoked familyId=${first.familyId} reason=${first.reason} sessions=${events.length}`;
}
