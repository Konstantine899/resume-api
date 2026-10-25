import type { TokenRole } from '../domain/token-claims';

/**
 * The slice of the users facade the auth application depends on. Declared
 * here so auth never imports the users domain — integration happens purely
 * at the application level (SPEC §1.4). `UserAccountsService` satisfies it
 * structurally.
 */
export interface UserAccountsProvider {
  findCredentialByEmail(
    rawEmail: string,
  ): Promise<{ userId: string; passwordHash: string; role: TokenRole } | null>;
  findProfileById(id: string): Promise<{ id: string; email: string; role: TokenRole } | null>;
}

/** Seed-only slice of the users facade (SPEC C12). */
export interface AdminAccountWriter {
  createOrUpdateAdmin(
    email: string,
    passwordHash: string,
  ): Promise<{ email: string; created: boolean }>;
}

/** Result of login/refresh: access goes in the response body, refresh into the cookie. */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCommand {
  email: string;
  password: string;
  deviceId?: string;
}
