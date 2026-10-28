import { Inject, Injectable, Logger } from '@nestjs/common';

import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from '../domain/constants';
import { DeviceId } from '../domain/device-id';
import { TokenFamily } from '../domain/token-family';
import type {
  AccessTokenIssuer,
  Clock,
  RefreshTokenCodec,
  SessionRepository,
} from '../domain/ports';
import { RefreshSession } from '../domain/refresh-session';
import type { TokenRole } from '../domain/token-claims';
import { ACCESS_TOKEN_ISSUER, CLOCK, SESSION_REPOSITORY, TOKEN_CODEC } from '../auth.tokens';
import { describeFamilyRevocations, revokeSessions } from './family-revocation';
import type { TokenPair } from './ports';

export interface IssueSessionCommand {
  userId: string;
  role: TokenRole;
  deviceId?: string;
}

export interface SessionIssuer {
  issue(command: IssueSessionCommand): Promise<TokenPair>;
}

@Injectable()
export class AuthSessionIssuer implements SessionIssuer {
  private readonly logger = new Logger(AuthSessionIssuer.name);

  constructor(
    @Inject(TOKEN_CODEC) private readonly tokens: RefreshTokenCodec,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(ACCESS_TOKEN_ISSUER) private readonly issuer: AccessTokenIssuer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async issue(command: IssueSessionCommand): Promise<TokenPair> {
    const now = this.clock.now();
    const deviceId = DeviceId.create(command.deviceId);

    const activeOnDevice = await this.sessions.findActiveByDevice(command.userId, deviceId.value);
    const replaced = revokeSessions(activeOnDevice, 'replaced', now);
    if (replaced.length > 0) {
      await this.sessions.saveAll(activeOnDevice);
      const line = describeFamilyRevocations(replaced);
      if (line) {
        this.logger.log(line);
      }
    }

    const familyId = TokenFamily.generate();
    const refreshToken = this.tokens.create();
    const session = RefreshSession.issue({
      familyId,
      userId: command.userId,
      deviceId,
      tokenHash: this.tokens.hash(refreshToken),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      createdAt: now,
    });
    await this.sessions.save(session);

    const accessToken = this.issuer.sign({ sub: command.userId, role: command.role });
    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }
}
