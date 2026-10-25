import { describe, expect, it } from 'vitest';

import { DeviceId } from '../domain/device-id';
import { RefreshSession } from '../domain/refresh-session';
import { TokenFamily } from '../domain/token-family';
import { InvalidSessionError } from './errors';
import { RefreshUseCase } from './refresh.use-case';
import {
  FakeAccounts,
  FakeClock,
  FakeCodec,
  FakeIssuer,
  FakeSessionRepository,
} from './test-fakes';

const HOUR = 60 * 60 * 1000;

function makeUseCase() {
  const accounts = new FakeAccounts();
  const codec = new FakeCodec();
  const sessions = new FakeSessionRepository();
  const clock = new FakeClock();
  accounts.add({
    userId: 'u-1',
    email: 'owner@test.local',
    passwordHash: 'pw:whatever',
    role: 'admin',
  });
  const useCase = new RefreshUseCase(accounts, codec, sessions, new FakeIssuer(), clock);
  return { useCase, accounts, codec, sessions, clock };
}

interface SeedOptions {
  expiresInMs?: number;
  status?: 'active' | 'used' | 'revoked';
}

async function seedSession(
  sessions: FakeSessionRepository,
  codec: FakeCodec,
  options: SeedOptions = {},
): Promise<{ session: RefreshSession; raw: string }> {
  const raw = codec.create();
  const now = new Date('2026-10-25T12:00:00.000Z');
  const session = RefreshSession.issue({
    familyId: TokenFamily.generate(),
    userId: 'u-1',
    deviceId: DeviceId.create('device-1'),
    tokenHash: codec.hash(raw),
    expiresAt: new Date(now.getTime() + (options.expiresInMs ?? 30 * 24 * HOUR)),
    createdAt: now,
  });
  if (options.status === 'used') {
    session.rotate(now);
  } else if (options.status === 'revoked') {
    session.revoke('logout', now);
  }
  await sessions.save(session);
  return { session, raw };
}

describe('RefreshUseCase (SPEC C4/C5/C6)', () => {
  it('C4: rotates an active session — old becomes used, new joins the same family', async () => {
    const { useCase, sessions, codec } = makeUseCase();
    const { session, raw } = await seedSession(sessions, codec);
    const otherSession = RefreshSession.issue({
      familyId: session.familyId,
      userId: 'u-1',
      deviceId: DeviceId.create('device-1'),
      tokenHash: codec.hash('sha-sibling'),
      expiresAt: new Date(Date.now() + 30 * 24 * HOUR),
    });
    await sessions.save(otherSession);

    const pair = await useCase.execute(raw);

    expect(pair.refreshToken).not.toBe(raw);
    expect(session.status).toBe('used');
    expect(session.usedAt).not.toBeNull();
    const issued = sessions.rows.find((row) => row.tokenHash === codec.hash(pair.refreshToken));
    expect(issued).toBeDefined();
    expect(issued?.familyId.value).toBe(session.familyId.value);
    expect(issued?.status).toBe('active');
    expect(issued?.deviceId.value).toBe('device-1');
    // Unrelated sessions of the family are untouched by a rotation.
    expect(otherSession.status).toBe('active');
    expect(pair.accessToken).toBe('access:u-1:admin');
    expect(pair.expiresIn).toBe(900);
  });

  it('C5: reuse of a used token revokes the ENTIRE family and forces re-login', async () => {
    const { useCase, sessions, codec } = makeUseCase();
    const { session, raw } = await seedSession(sessions, codec, { status: 'used' });
    const sibling = RefreshSession.issue({
      familyId: session.familyId,
      userId: 'u-1',
      deviceId: DeviceId.create('device-1'),
      tokenHash: codec.hash('sha-sibling'),
      expiresAt: new Date(Date.now() + 30 * 24 * HOUR),
    });
    await sessions.save(sibling);

    await expect(useCase.execute(raw)).rejects.toBeInstanceOf(InvalidSessionError);

    for (const row of sessions.rows) {
      expect(row.status).toBe('revoked');
      expect(row.revokedReason).toBe('reuse');
    }
  });

  it('C5: after the family died, ANY of its tokens keeps being rejected', async () => {
    const { useCase, sessions, codec } = makeUseCase();
    const { session, raw } = await seedSession(sessions, codec, { status: 'used' });
    const aliveSibling = RefreshSession.issue({
      familyId: session.familyId,
      userId: 'u-1',
      deviceId: DeviceId.create('device-1'),
      tokenHash: codec.hash('sha-alive'),
      expiresAt: new Date(Date.now() + 30 * 24 * HOUR),
    });
    await sessions.save(aliveSibling);

    await expect(useCase.execute(raw)).rejects.toThrow('Invalid session');
    // The sibling was active before; now it is revoked as part of the family.
    expect(aliveSibling.status).toBe('revoked');
    await expect(useCase.execute('sha-alive')).rejects.toThrow('Invalid session');
  });

  it('C6: an expired active session revokes the family and is rejected', async () => {
    const { useCase, sessions, codec } = makeUseCase();
    const { session, raw } = await seedSession(sessions, codec, { expiresInMs: -1000 });

    await expect(useCase.execute(raw)).rejects.toBeInstanceOf(InvalidSessionError);
    expect(session.status).toBe('revoked');
    expect(session.revokedReason).toBe('expired');
  });

  it('C6: an unknown token is rejected without touching anything', async () => {
    const { useCase, sessions, codec } = makeUseCase();
    const { session } = await seedSession(sessions, codec);

    await expect(useCase.execute(codec.create())).rejects.toBeInstanceOf(InvalidSessionError);
    expect(session.status).toBe('active');
  });

  it('C7: a missing cookie (null token) is rejected generically', async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute(null)).rejects.toThrow('Invalid session');
  });

  it('C6: an already-revoked token stays rejected (family is dead)', async () => {
    const { useCase, sessions, codec } = makeUseCase();
    const { raw } = await seedSession(sessions, codec, { status: 'revoked' });

    await expect(useCase.execute(raw)).rejects.toThrow('Invalid session');
  });

  it('race: losing the conditional active->used update is treated as reuse', async () => {
    const { useCase, sessions, codec } = makeUseCase();
    const { session, raw } = await seedSession(sessions, codec);
    sessions.failNextMarkActiveUsed = true;

    await expect(useCase.execute(raw)).rejects.toBeInstanceOf(InvalidSessionError);
    expect(sessions.markActiveUsedCalls).toBe(1);
    expect(session.status).toBe('revoked');
    expect(session.revokedReason).toBe('reuse');
  });
});
