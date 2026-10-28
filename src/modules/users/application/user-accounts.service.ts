import { Inject, Injectable } from '@nestjs/common';

import type { UserLanguage, UserRole, UserTheme } from '../domain/user';
import { User, UserDomainError, UserEmailConflictError } from '../domain/user';
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
  theme: UserTheme;
  language: UserLanguage;
}

export { UserEmailConflictError } from '../domain/user';

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
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      theme: user.theme,
      language: user.language,
    };
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

  /**
   * Registration facade used by auth. No pre-check; duplicate detection is the
   * DB unique constraint surfaced through the repository.
   */
  async createRegisteredUser(
    email: string,
    passwordHash: string,
  ): Promise<{ userId: string; email: string; role: UserRole }> {
    const normalized = User.normalizeEmail(email);
    const user = User.createRegisteredUser({ email: normalized, passwordHash });
    const persist = this.users.create?.bind(this.users) ?? this.users.save.bind(this.users);
    try {
      await persist(user);
    } catch (error) {
      if (error instanceof UserEmailConflictError) {
        throw error;
      }
      throw error;
    }
    return { userId: user.id, email: normalized, role: user.role };
  }

  /**
   * Partial update of the authenticated user's preferences. `undefined`
   * values are ignored, so callers can PATCH a single field.
   */
  async updatePreferences(
    userId: string,
    patch: { theme?: UserTheme; language?: UserLanguage },
  ): Promise<UserProfile | null> {
    const user = await this.users.findById(userId);
    if (!user) {
      return null;
    }
    user.changePreferences(patch);
    await this.users.save(user);
    const refreshed = await this.users.findById(userId);
    const resolved = refreshed ?? user;
    return {
      id: resolved.id,
      email: resolved.email,
      role: resolved.role,
      theme: resolved.theme,
      language: resolved.language,
    };
  }
}
