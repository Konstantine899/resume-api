import { describe, expect, it } from 'vitest';

import { DeviceId } from '../domain/device-id';
import { RefreshSession } from '../domain/refresh-session';
import { TokenFamily } from '../domain/token-family';
import { LogoutUseCase } from './logout.use-case';
import { MeUseCase } from './me.use-case';
import { InvalidSessionError } from './errors';
import { FakeAccounts, FakeClock, FakeCodec, FakeSessionRepository } from './test-fakes';

describe('LogoutUseCase (SPEC C8)', () => {
  function setup() {
    const codec = new FakeCodec();
    const sessions = new FakeSessionRepository();
    const clock = new FakeClock();
    const useCase = new LogoutUseCase(codec, sessions, clock);
    return { useCase, codec, sessions };
  }

  function seed(sessions: FakeSessionRepository, codec: FakeCodec) {
    const now = new Date('2026-10-25T12:00:00.000Z');
    const family = TokenFamily.generate();
    const first = RefreshSession.issue({
      familyId: family,
      userId: 'u-1',
      deviceId: DeviceId.create('device-1'),
      tokenHash: codec.hash('raw-1'),
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });
    const second = RefreshSession.issue({
      familyId: family,
      userId: 'u-1',
      deviceId: DeviceId.create('device-1'),
      tokenHash: codec.hash('raw-2'),
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
    });
    return { first, second, sessions: [first, second] };
  }

  it('revokes the WHOLE family behind the presented token', async () => {
    const { useCase, codec, sessions } = setup();
    const seeded = seed(sessions, codec);
    await sessions.saveAll(seeded.sessions);

    await useCase.execute('raw-1');

    expect(seeded.first.status).toBe('revoked');
    expect(seeded.first.revokedReason).toBe('logout');
    expect(seeded.second.status).toBe('revoked');
    expect(seeded.second.revokedReason).toBe('logout');
  });

  it('is idempotent: no token, unknown token and dead family all succeed', async () => {
    const { useCase, codec, sessions } = setup();
    const seeded = seed(sessions, codec);
    await sessions.saveAll(seeded.sessions);

    await expect(useCase.execute(null)).resolves.toBeUndefined();
    await expect(useCase.execute('unknown')).resolves.toBeUndefined();
    await useCase.execute('raw-1');
    // Second logout of an already-revoked family: no error, no change.
    await expect(useCase.execute('raw-1')).resolves.toBeUndefined();
    expect(seeded.first.revokedReason).toBe('logout');
  });
});

describe('MeUseCase (SPEC C16)', () => {
  it('returns the profile for valid claims', async () => {
    const accounts = new FakeAccounts();
    accounts.add({
      userId: 'u-1',
      email: 'owner@test.local',
      passwordHash: 'pw:x',
      role: 'admin',
    });

    const result = await new MeUseCase(accounts).execute({
      sub: 'u-1',
      role: 'admin',
      typ: 'access',
    });

    expect(result).toEqual({
      id: 'u-1',
      email: 'owner@test.local',
      role: 'admin',
      theme: 'dark',
      language: 'ru',
    });
  });

  it('rejects claims of an account that no longer exists', async () => {
    const accounts = new FakeAccounts();

    await expect(
      new MeUseCase(accounts).execute({ sub: 'ghost', role: 'admin', typ: 'access' }),
    ).rejects.toBeInstanceOf(InvalidSessionError);
  });
});
