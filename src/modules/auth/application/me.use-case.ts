import { Inject, Injectable } from '@nestjs/common';

import type { AccessTokenClaims } from '../domain/token-claims';
import { UserAccountsService } from '../../users/application/user-accounts.service';
import { InvalidSessionError } from './errors';
import type { UserAccountsProvider } from './ports';

export interface MeResult {
  id: string;
  email: string;
  role: string;
}

/**
 * GET /auth/me (SPEC C16): resolves the verified access-token claims into
 * the current profile. A token whose account no longer exists is treated as
 * invalid (force re-login).
 */
@Injectable()
export class MeUseCase {
  constructor(@Inject(UserAccountsService) private readonly accounts: UserAccountsProvider) {}

  async execute(claims: AccessTokenClaims): Promise<MeResult> {
    const profile = await this.accounts.findProfileById(claims.sub);
    if (!profile) {
      throw new InvalidSessionError('Invalid session');
    }
    return { id: profile.id, email: profile.email, role: profile.role };
  }
}
