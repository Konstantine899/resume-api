import { Inject, Injectable } from '@nestjs/common';

import type { PasswordHasher } from '../domain/ports';
import { UserAccountsService } from '../../users/application/user-accounts.service';
import { PASSWORD_HASHER } from '../auth.tokens';
import { AuthSessionIssuer } from './session-issuer';
import { InvalidCredentialsError } from './errors';
import type { LoginCommand, TokenPair, UserAccountsProvider } from './ports';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(UserAccountsService) private readonly accounts: UserAccountsProvider,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(AuthSessionIssuer) private readonly issuer: AuthSessionIssuer,
  ) {}

  async execute(command: LoginCommand): Promise<TokenPair> {
    const credential = await this.accounts.findCredentialByEmail(command.email);

    let passwordMatches = false;
    if (credential) {
      passwordMatches = await this.hasher.verify(credential.passwordHash, command.password);
    } else {
      await this.hasher.verifyAgainstDummy(command.password);
    }
    if (!credential || !passwordMatches) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    return this.issuer.issue({
      userId: credential.userId,
      role: credential.role,
      deviceId: command.deviceId,
    });
  }
}
