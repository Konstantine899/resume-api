import { Inject, Injectable } from '@nestjs/common';

import { EmailAlreadyRegisteredError } from './errors';
import {
  UserAccountsService,
  UserEmailConflictError,
} from '../../users/application/user-accounts.service';
import { AuthSessionIssuer } from './session-issuer';
import type { PasswordHasher } from '../domain/ports';
import { PASSWORD_HASHER } from '../auth.tokens';
import type { TokenRole } from '../domain/token-claims';
import type { UserAccountsProvider, TokenPair } from './ports';

export interface RegisterCommand {
  email: string;
  password: string;
  deviceId?: string;
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(UserAccountsService) private readonly accounts: UserAccountsProvider,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(AuthSessionIssuer) private readonly issuer: AuthSessionIssuer,
  ) {}

  async execute(command: RegisterCommand): Promise<TokenPair> {
    const passwordHash = await this.hasher.hash(command.password);

    let profile: { userId: string; email: string; role: TokenRole };
    try {
      profile = await this.accounts.createRegisteredUser(command.email, passwordHash);
    } catch (error) {
      if (error instanceof UserEmailConflictError) {
        throw new EmailAlreadyRegisteredError('Email is already registered');
      }
      throw error;
    }

    return this.issuer.issue({
      userId: profile.userId,
      role: profile.role,
      deviceId: command.deviceId,
    });
  }
}
