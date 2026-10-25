import { describe, expect, it } from 'vitest';

import { REFRESH_TOKEN_TTL_SECONDS } from '../domain/constants';
import { LoginUseCase } from './login.use-case';
import { InvalidCredentialsError } from './errors';
import {
  FakeAccounts,
  FakeClock,
  FakeCodec,
  FakeHasher,
  FakeIssuer,
  FakeSessionRepository,
} from './test-fakes';

const ACCESS = 'correct-password';

function makeUseCase() {
  const accounts = new FakeAccounts();
  const hasher = new FakeHasher();
  const codec = new FakeCodec();
  const sessions = new FakeSessionRepository();
  const clock = new FakeClock();
  const useCase = new LoginUseCase(accounts, hasher, codec, sessions, new FakeIssuer(), clock);
  return { useCase, accounts, hasher, codec, sessions, clock };
}

describe('LoginUseCase (SPEC C1/C2/C17)', () => {
  it('rejects an unknown account with the generic error and does timing-equalization work', async () => {
    const { useCase, hasher } = makeUseCase();

    const attempt = useCase.execute({ email: 'ghost@test.local', password: ACCESS });

    await expect(attempt).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(useCase.execute({ email: 'ghost@test.local', password: ACCESS })).rejects.toThrow(
      'Invalid credentials',
    );
    expect(hasher.dummyCalls).toBe(2);
  });

  it('C2: unknown account and wrong password produce the IDENTICAL error message', async () => {
    const { useCase, accounts } = makeUseCase();
    accounts.add({
      userId: 'u-1',
      email: 'owner@test.local',
      passwordHash: `pw:${ACCESS}`,
      role: 'admin',
    });

    const unknown = await useCase
      .execute({ email: 'nobody@test.local', password: ACCESS })
      .catch((error: unknown) => error);
    const wrongPassword = await useCase
      .execute({ email: 'owner@test.local', password: 'nope' })
      .catch((error: unknown) => error);

    expect(unknown).toBeInstanceOf(InvalidCredentialsError);
    expect(wrongPassword).toBeInstanceOf(InvalidCredentialsError);
    expect((unknown as Error).message).toBe((wrongPassword as Error).message);
    expect((unknown as Error).message).toBe('Invalid credentials');
  });

  it('C1: successful login returns access in the body and refresh as a separate secret', async () => {
    const { useCase, accounts, sessions, clock } = makeUseCase();
    accounts.add({
      userId: 'u-1',
      email: 'owner@test.local',
      passwordHash: `pw:${ACCESS}`,
      role: 'admin',
    });

    const pair = await useCase.execute({ email: 'owner@test.local', password: ACCESS });

    expect(pair.accessToken).toBe('access:u-1:admin');
    expect(pair.expiresIn).toBe(900);
    expect(pair.refreshToken).toBe('raw-refresh-1');

    // The raw refresh token never reaches storage — only its hash (C14).
    const stored = sessions.rows[0];
    expect(stored.tokenHash).toBe('sha256:raw-refresh-1');
    expect(stored.tokenHash).not.toBe(pair.refreshToken);
    expect(stored.status).toBe('active');
    expect(stored.userId).toBe('u-1');
    expect(stored.expiresAt.getTime() - clock.now().getTime()).toBe(
      REFRESH_TOKEN_TTL_SECONDS * 1000,
    );
  });

  it('C17: re-login with the SAME deviceId revokes the previous family (replaced)', async () => {
    const { useCase, accounts, sessions } = makeUseCase();
    accounts.add({
      userId: 'u-1',
      email: 'owner@test.local',
      passwordHash: `pw:${ACCESS}`,
      role: 'admin',
    });

    const first = await useCase.execute({
      email: 'owner@test.local',
      password: ACCESS,
      deviceId: 'device-x',
    });
    const second = await useCase.execute({
      email: 'owner@test.local',
      password: ACCESS,
      deviceId: 'device-x',
    });

    const firstSession = sessions.rows.find(
      (row) => row.tokenHash === `sha256:${first.refreshToken}`,
    );
    expect(firstSession?.status).toBe('revoked');
    expect(firstSession?.revokedReason).toBe('replaced');
    // The new family is alive and has a different id.
    const secondSession = sessions.rows.find(
      (row) => row.tokenHash === `sha256:${second.refreshToken}`,
    );
    expect(secondSession?.status).toBe('active');
    expect(secondSession?.familyId.value).not.toBe(firstSession?.familyId.value);
  });

  it('C17: a different deviceId keeps the previous family alive (one family per device)', async () => {
    const { useCase, accounts, sessions } = makeUseCase();
    accounts.add({
      userId: 'u-1',
      email: 'owner@test.local',
      passwordHash: `pw:${ACCESS}`,
      role: 'admin',
    });

    const first = await useCase.execute({
      email: 'owner@test.local',
      password: ACCESS,
      deviceId: 'phone',
    });
    await useCase.execute({
      email: 'owner@test.local',
      password: ACCESS,
      deviceId: 'laptop',
    });

    const firstSession = sessions.rows.find(
      (row) => row.tokenHash === `sha256:${first.refreshToken}`,
    );
    expect(firstSession?.status).toBe('active');
  });

  it('generates a server-side deviceId when the client sends none', async () => {
    const { useCase, accounts, sessions } = makeUseCase();
    accounts.add({
      userId: 'u-1',
      email: 'owner@test.local',
      passwordHash: `pw:${ACCESS}`,
      role: 'admin',
    });

    await useCase.execute({ email: 'owner@test.local', password: ACCESS });

    expect(sessions.rows[0].deviceId.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
