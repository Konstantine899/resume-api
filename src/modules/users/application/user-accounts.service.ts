import { Inject, Injectable } from '@nestjs/common';

import type { UserRole } from '../domain/user';
import { User, UserDomainError } from '../domain/user';
import type { UserRepository } from '../domain/user.repository';
import { USER_REPOSITORY } from '../users.tokens';

export interface UserCredential {
  userId: string;
  passwordHash: string;
  role: UserRole;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
}

export interface AdminSeedResult {
  email: string;
  created: boolean;
}

/**
 * Application facade of the users context. The auth context talks to users
 * ONLY through this service (SPEC auth §1.4, users SPEC U4) — it never
 * touches the `User` table or the users domain directly.
 */
@Injectable()
export class UserAccountsService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  /** Credential lookup for login; email is normalized before the query. */
  async findCredentialByEmail(rawEmail: string): Promise<UserCredential | null> {
    const user = await this.users.findByEmail(User.normalizeEmail(rawEmail));
    if (!user) {
      return null;
    }
    return { userId: user.id, passwordHash: user.passwordHash, role: user.role };
  }

  async findProfileById(id: string): Promise<UserProfile | null> {
    const user = await this.users.findById(id);
    if (!user) {
      return null;
    }
    return { id: user.id, email: user.email, role: user.role };
  }

  /**
   * Idempotent create-or-update of the admin account (CLI seed). The caller
   * (auth seed use-case) passes an already-hashed password — users does not
   * know about hashing algorithms.
   */
  async createOrUpdateAdmin(email: string, passwordHash: string): Promise<AdminSeedResult> {
    const normalized = User.normalizeEmail(email);
    const existing = await this.users.findByEmail(normalized);

    if (existing) {
      if (existing.role !== 'admin') {
        throw new UserDomainError(`U-I2: existing user ${normalized} is not an admin`);
      }
      existing.changePassword(passwordHash);
      await this.users.save(existing);
      return { email: normalized, created: false };
    }

    const user = User.createAdmin({ email: normalized, passwordHash });
    await this.users.save(user);
    return { email: normalized, created: true };
  }
}
