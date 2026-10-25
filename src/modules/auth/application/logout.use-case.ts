import { Inject, Injectable, Logger } from '@nestjs/common';

import type { Clock, RefreshTokenCodec, SessionRepository } from '../domain/ports';
import { CLOCK, SESSION_REPOSITORY, TOKEN_CODEC } from '../auth.tokens';
import { describeFamilyRevocations, revokeFamily } from './family-revocation';

/**
 * POST /auth/logout (SPEC C8): revokes the whole family behind the presented
 * refresh token and always clears the cookie (idempotent — no error paths).
 */
@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    @Inject(TOKEN_CODEC) private readonly tokens: RefreshTokenCodec,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(rawRefreshToken: string | null): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }
    const now = this.clock.now();
    const session = await this.sessions.findByTokenHash(this.tokens.hash(rawRefreshToken));
    if (!session || session.status === 'revoked') {
      return;
    }
    const events = await revokeFamily(this.sessions, session.familyId.value, 'logout', now);
    const line = describeFamilyRevocations(events);
    if (line) {
      this.logger.log(line);
    }
  }
}
