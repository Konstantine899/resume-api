/**
 * In-memory fakes for the auth use-case unit tests (test-only file: it is
 * excluded from `tsconfig.build.json` and never ships). No vitest imports —
 * plain classes so they can be composed freely inside *.test.ts files.
 */
import type {
  AccessTokenIssuer,
  Clock,
  PasswordHasher,
  RefreshTokenCodec,
  SessionRepository,
} from '../domain/ports';
import type { AccessTokenClaims, TokenRole } from '../domain/token-claims';
import { RefreshSession } from '../domain/refresh-session';
import type { UserAccountsProvider } from './ports';
import { UserEmailConflictError } from '../../users/application/user-accounts.service';

export class FakeClock implements Clock {
  private current: Date;

  constructor(current: Date = new Date('2026-10-25T12:00:00.000Z')) {
    this.current = current;
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

/** Passwords are stored as `pw:<plain>`; `verify` compares against it. */
export class FakeHasher implements PasswordHasher {
  dummyCalls = 0;

  async hash(plain: string): Promise<string> {
    return `pw:${plain}`;
  }

  async verify(phcHash: string, plain: string): Promise<boolean> {
    return phcHash === `pw:${plain}`;
  }

  async verifyAgainstDummy(): Promise<boolean> {
    this.dummyCalls += 1;
    return false;
  }
}

export class FakeCodec implements RefreshTokenCodec {
  private counter = 0;

  create(): string {
    this.counter += 1;
    return `raw-refresh-${this.counter}`;
  }

  hash(raw: string): string {
    return `sha256:${raw}`;
  }
}

export class FakeIssuer implements AccessTokenIssuer {
  sign(input: { sub: string; role: TokenRole }): string {
    return `access:${input.sub}:${input.role}`;
  }

  verify(): AccessTokenClaims {
    throw new Error('not used in unit tests');
  }
}

export interface FakeUserAccount {
  userId: string;
  email: string;
  passwordHash: string;
  role: TokenRole;
  theme?: string;
  language?: string;
}

export class FakeAccounts implements UserAccountsProvider {
  readonly accounts = new Map<string, FakeUserAccount>();

  add(account: FakeUserAccount): void {
    this.accounts.set(account.email.trim().toLowerCase(), account);
  }

  async findCredentialByEmail(rawEmail: string) {
    const account = this.accounts.get(rawEmail.trim().toLowerCase());
    if (!account) {
      return null;
    }
    return {
      userId: account.userId,
      passwordHash: account.passwordHash,
      role: account.role,
    };
  }

  async findProfileById(id: string) {
    for (const account of this.accounts.values()) {
      if (account.userId === id) {
        return {
          id: account.userId,
          email: account.email,
          role: account.role,
          theme: account.theme ?? 'dark',
          language: account.language ?? 'ru',
        };
      }
    }
    return null;
  }

  async createRegisteredUser(email: string, passwordHash: string) {
    const normalized = email.trim().toLowerCase();
    if (this.accounts.has(normalized)) {
      throw new UserEmailConflictError();
    }
    void passwordHash;
    const account: FakeUserAccount = {
      userId: `reg-${normalized}`,
      email: normalized,
      passwordHash,
      role: 'user',
    };
    this.accounts.set(normalized, account);
    return { userId: account.userId, email: normalized, role: account.role };
  }
}

export class FakeSessionRepository implements SessionRepository {
  readonly rows: RefreshSession[] = [];
  /** Set to make the next `markActiveUsed` lose a simulated race. */
  failNextMarkActiveUsed = false;
  markActiveUsedCalls = 0;
  private readonly markedUsed = new Set<string>();

  async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    return this.rows.find((row) => row.tokenHash === tokenHash) ?? null;
  }

  async findFamily(familyId: string): Promise<RefreshSession[]> {
    return this.rows.filter((row) => row.familyId.value === familyId);
  }

  async findActiveByDevice(userId: string, deviceId: string): Promise<RefreshSession[]> {
    return this.rows.filter(
      (row) => row.userId === userId && row.deviceId.value === deviceId && row.status === 'active',
    );
  }

  async save(session: RefreshSession): Promise<void> {
    const index = this.rows.findIndex((row) => row.id === session.id);
    if (index >= 0) {
      this.rows[index] = session;
    } else {
      this.rows.push(session);
    }
  }

  async saveAll(sessions: RefreshSession[]): Promise<void> {
    for (const session of sessions) {
      await this.save(session);
    }
  }

  /**
   * Mirrors the conditional `UPDATE ... WHERE status = 'active'`: the fake
   * shares object references with the use-case (unlike a database row), so
   * the transition is tracked by id instead of re-reading `status`.
   */
  async markActiveUsed(id: string): Promise<boolean> {
    this.markActiveUsedCalls += 1;
    if (this.failNextMarkActiveUsed) {
      this.failNextMarkActiveUsed = false;
      return false;
    }
    if (!this.rows.some((row) => row.id === id)) {
      return false;
    }
    if (this.markedUsed.has(id)) {
      // Second conditional update: someone else already rotated the row.
      return false;
    }
    this.markedUsed.add(id);
    return true;
  }
}
