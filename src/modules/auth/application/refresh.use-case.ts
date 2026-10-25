import { Inject, Injectable, Logger } from '@nestjs/common';

import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from '../domain/constants';
import { RefreshSession } from '../domain/refresh-session';
import type {
  AccessTokenIssuer,
  Clock,
  RefreshTokenCodec,
  SessionRepository,
} from '../domain/ports';
import { UserAccountsService } from '../../users/application/user-accounts.service';
import { ACCESS_TOKEN_ISSUER, CLOCK, SESSION_REPOSITORY, TOKEN_CODEC } from '../auth.tokens';
import { InvalidSessionError } from './errors';
import { describeFamilyRevocations, revokeFamily } from './family-revocation';
import type { TokenPair, UserAccountsProvider } from './ports';

/**
 * POST /auth/refresh (SPEC C4/C5/C6).
 *
 * Rotation: the presented active session becomes `used` and a fresh token is
 * issued in the same family. Presenting an already-`used` token is REUSE:
 * the whole family is revoked and the client is forced to log in again (I4).
 * A conditional active->used update guards against two parallel refreshes of
 * the same token — the loser is treated as reuse.
 */
@Injectable()
export class RefreshUseCase {
  private readonly logger = new Logger(RefreshUseCase.name);

  constructor(
    @Inject(UserAccountsService) private readonly accounts: UserAccountsProvider,
    @Inject(TOKEN_CODEC) private readonly tokens: RefreshTokenCodec,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(ACCESS_TOKEN_ISSUER) private readonly issuer: AccessTokenIssuer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(rawRefreshToken: string | null): Promise<TokenPair> {
    const now = this.clock.now();
    if (!rawRefreshToken) {
      throw new InvalidSessionError('Invalid session');
    }

    const session = await this.sessions.findByTokenHash(this.tokens.hash(rawRefreshToken));
    if (!session) {
      throw new InvalidSessionError('Invalid session');
    }

    if (session.status === 'revoked') {
      // Family already dead — generic 401, nothing to revoke again.
      throw new InvalidSessionError('Invalid session');
    }

    if (session.status === 'used') {
      // REUSE of a rotated token → revoke the ENTIRE family (I4, SPEC C5).
      await this.revokeAndLog(session.familyId.value, 'reuse', now);
      throw new InvalidSessionError('Invalid session');
    }

    if (session.isExpired(now)) {
      // I3: expired active session → no rotation, family dies.
      await this.revokeAndLog(session.familyId.value, 'expired', now);
      throw new InvalidSessionError('Invalid session');
    }

    const rotated = session.rotate(now);
    const persisted = await this.sessions.markActiveUsed(session.id, now);
    if (!persisted) {
      // Lost the race against a parallel refresh of the same token → reuse.
      await this.revokeAndLog(session.familyId.value, 'reuse', now);
      throw new InvalidSessionError('Invalid session');
    }

    const refreshToken = this.tokens.create();
    const next = RefreshSession.issue({
      familyId: session.familyId,
      userId: session.userId,
      deviceId: session.deviceId,
      tokenHash: this.tokens.hash(refreshToken),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      createdAt: now,
    });
    await this.sessions.save(next);
    this.logger.log(`TokenRotated sessionId=${rotated.sessionId} familyId=${rotated.familyId}`);

    const profile = await this.accounts.findProfileById(session.userId);
    if (!profile) {
      // The account disappeared while a session existed — force re-login.
      await this.revokeAndLog(session.familyId.value, 'expired', now);
      throw new InvalidSessionError('Invalid session');
    }

    const accessToken = this.issuer.sign({ sub: profile.id, role: profile.role });
    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  private async revokeAndLog(
    familyId: string,
    reason: 'reuse' | 'expired',
    now: Date,
  ): Promise<void> {
    const events = await revokeFamily(this.sessions, familyId, reason, now);
    const line = describeFamilyRevocations(events);
    if (line) {
      this.logger.log(line);
    }
  }
}
