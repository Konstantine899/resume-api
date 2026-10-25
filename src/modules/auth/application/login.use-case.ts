import { Inject, Injectable, Logger } from '@nestjs/common';

import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from '../domain/constants';
import { DeviceId } from '../domain/device-id';
import { TokenFamily } from '../domain/token-family';
import type {
  AccessTokenIssuer,
  Clock,
  PasswordHasher,
  RefreshTokenCodec,
  SessionRepository,
} from '../domain/ports';
import { RefreshSession } from '../domain/refresh-session';
import { UserAccountsService } from '../../users/application/user-accounts.service';
import {
  ACCESS_TOKEN_ISSUER,
  CLOCK,
  PASSWORD_HASHER,
  SESSION_REPOSITORY,
  TOKEN_CODEC,
} from '../auth.tokens';
import { InvalidCredentialsError } from './errors';
import { describeFamilyRevocations, revokeSessions } from './family-revocation';
import type { LoginCommand, TokenPair, UserAccountsProvider } from './ports';

/**
 * POST /auth/login (SPEC C1/C2/C3/C17).
 *
 * - unknown account and wrong password produce the SAME generic error and
 *   the same amount of work (dummy argon2 verify — anti enumeration);
 * - one active refresh family per device: re-login with the same deviceId
 *   revokes the previous family (`replaced`);
 * - access token 15m in the response body, refresh token only as a hash in
 *   the DB and as an httpOnly cookie on the wire.
 */
@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(UserAccountsService) private readonly accounts: UserAccountsProvider,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_CODEC) private readonly tokens: RefreshTokenCodec,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(ACCESS_TOKEN_ISSUER) private readonly issuer: AccessTokenIssuer,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: LoginCommand): Promise<TokenPair> {
    const now = this.clock.now();
    const credential = await this.accounts.findCredentialByEmail(command.email);

    let passwordMatches = false;
    if (credential) {
      passwordMatches = await this.hasher.verify(credential.passwordHash, command.password);
    } else {
      // Same work as a real verify: response time must not reveal whether
      // the account exists (SPEC C2).
      await this.hasher.verifyAgainstDummy(command.password);
    }
    if (!credential || !passwordMatches) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    const deviceId = DeviceId.create(command.deviceId);
    const activeOnDevice = await this.sessions.findActiveByDevice(
      credential.userId,
      deviceId.value,
    );
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
      userId: credential.userId,
      deviceId,
      tokenHash: this.tokens.hash(refreshToken),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      createdAt: now,
    });
    await this.sessions.save(session);

    const accessToken = this.issuer.sign({ sub: credential.userId, role: credential.role });
    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }
}
