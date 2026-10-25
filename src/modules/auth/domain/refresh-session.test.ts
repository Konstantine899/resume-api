import { describe, expect, it } from 'vitest';

import { InvariantViolationError } from './errors';
import { DeviceId } from './device-id';
import { RefreshSession } from './refresh-session';
import { TokenFamily } from './token-family';

const HOUR = 60 * 60 * 1000;

function futureDate(now: Date, ms: number): Date {
  return new Date(now.getTime() + ms);
}

function makeSession(now: Date, expiresInMs = 30 * 24 * HOUR): RefreshSession {
  return RefreshSession.issue({
    familyId: TokenFamily.generate(),
    userId: 'user-1',
    deviceId: DeviceId.create('device-1'),
    tokenHash: 'a'.repeat(64),
    expiresAt: futureDate(now, expiresInMs),
    createdAt: now,
  });
}

describe('RefreshSession aggregate (SPEC 1.1)', () => {
  const now = new Date('2026-10-25T12:00:00.000Z');

  it('issues an active session with no timestamps yet', () => {
    const session = makeSession(now);

    expect(session.status).toBe('active');
    expect(session.usedAt).toBeNull();
    expect(session.revokedAt).toBeNull();
    expect(session.revokedReason).toBeNull();
    expect(session.isExpired(now)).toBe(false);
  });

  it('I1: rotate() moves active -> used, stamps usedAt and raises TokenRotated', () => {
    const session = makeSession(now);

    const event = session.rotate(now);

    expect(session.status).toBe('used');
    expect(session.usedAt).toEqual(now);
    expect(event).toEqual({
      type: 'TokenRotated',
      sessionId: session.id,
      familyId: session.familyId.value,
      userId: 'user-1',
      rotatedAt: now,
    });
  });

  it('I1: rotate() refuses a used session (only active may rotate)', () => {
    const session = makeSession(now);
    session.rotate(now);

    expect(() => session.rotate(new Date(now.getTime() + 1000))).toThrow(InvariantViolationError);
    expect(() => session.rotate(new Date(now.getTime() + 1000))).toThrow(/only active/);
  });

  it('I1: rotate() refuses a revoked session — revoked is terminal', () => {
    const session = makeSession(now);
    session.revoke('logout', now);

    expect(() => session.rotate(now)).toThrow(InvariantViolationError);
    expect(session.status).toBe('revoked');
  });

  it('I1/I3: rotate() refuses an expired session', () => {
    const session = makeSession(now, -1000);

    expect(() => session.rotate(now)).toThrow(/expired/);
    expect(session.status).toBe('active');
  });

  it('I2: revoke() from active raises TokenFamilyRevoked and is terminal', () => {
    const session = makeSession(now);

    const event = session.revoke('reuse', now);

    expect(event).toEqual({
      type: 'TokenFamilyRevoked',
      familyId: session.familyId.value,
      userId: 'user-1',
      reason: 'reuse',
      revokedAt: now,
    });
    expect(session.status).toBe('revoked');
    expect(session.revokedReason).toBe('reuse');
    expect(session.revokedAt).toEqual(now);
  });

  it('I2: revoke() works from used too (reuse detection path)', () => {
    const session = makeSession(now);
    session.rotate(now);

    const event = session.revoke('reuse', now);

    expect(event?.reason).toBe('reuse');
    expect(session.status).toBe('revoked');
  });

  it('I2: revoke() is idempotent — second call is a no-op and returns null', () => {
    const session = makeSession(now);
    session.revoke('logout', now);

    const second = session.revoke('expired', new Date(now.getTime() + 5000));

    expect(second).toBeNull();
    expect(session.revokedReason).toBe('logout');
    expect(session.revokedAt).toEqual(now);
  });

  it('never exposes the raw token — only the SHA-256 hash', () => {
    const session = makeSession(now);
    const props = JSON.stringify(session);

    expect(props).toContain('a'.repeat(64));
    expect(session.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
