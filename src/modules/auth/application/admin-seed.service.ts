import { Inject, Injectable } from '@nestjs/common';

import type { PasswordHasher } from '../domain/ports';
import { PASSWORD_HASHER } from '../auth.tokens';
import { UserAccountsService } from '../../users/application/user-accounts.service';
import type { AdminAccountWriter } from './ports';

export interface AdminSeedCommand {
  email: string;
  password: string;
}

export interface AdminSeedResult {
  email: string;
  created: boolean;
}

/**
 * Admin provisioning path (SPEC C12): `npm run seed:admin` hashes the env
 * password with argon2id and hands the hash to the users facade, which upserts
 * the admin idempotently. Public registration creates non-admin users only.
 */
@Injectable()
export class AdminSeedService {
  constructor(
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(UserAccountsService) private readonly accounts: AdminAccountWriter,
  ) {}

  async run(command: AdminSeedCommand): Promise<AdminSeedResult> {
    const passwordHash = await this.hasher.hash(command.password);
    return this.accounts.createOrUpdateAdmin(command.email, passwordHash);
  }
}
