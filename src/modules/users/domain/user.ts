import { randomUUID } from 'node:crypto';

/** The only role available on this personal site (single admin user). */
export type UserRole = 'admin';

export const ADMIN_ROLE: UserRole = 'admin';

const LOOSE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const ARGON2ID_PHC_PREFIX = '$argon2id$';

export interface UserProps {
  id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: Date;
}

export class UserDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDomainError';
  }
}

/**
 * Aggregate root of the users context (users/spec/SPEC.md §1).
 * Invariants:
 *  U-I1 — email is normalized (trim + lowercase), non-empty and valid;
 *  U-I2 — the role can only be `admin`;
 *  U-I3 — the password hash is an argon2id PHC string (params live inside it).
 */
export class User {
  private readonly props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  static normalizeEmail(raw: string): string {
    return raw.trim().toLowerCase();
  }

  /** U-I1: non-empty, bounded, one `@`, no whitespace (zod validates on the CLI boundary). */
  static assertEmail(email: string): void {
    if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !LOOSE_EMAIL_PATTERN.test(email)) {
      throw new UserDomainError('U-I1: invalid email address');
    }
  }

  /** Creates the admin account (the only creation path — no public registration). */
  static createAdmin(input: { email: string; passwordHash: string; id?: string }): User {
    const email = User.normalizeEmail(input.email);
    User.assertEmail(email);
    return new User({
      id: input.id ?? randomUUID(),
      email,
      role: ADMIN_ROLE,
      passwordHash: input.passwordHash,
      createdAt: new Date(),
    });
  }

  /** Re-hydrates a stored row, re-checking every invariant. */
  static reconstitute(props: UserProps): User {
    User.assertEmail(props.email);
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Seed-only mutation: rotate the stored password hash. */
  changePassword(passwordHash: string): void {
    this.validatePasswordHash(passwordHash);
    this.props.passwordHash = passwordHash;
  }

  private validatePasswordHash(hash: string): void {
    if (!hash.startsWith(ARGON2ID_PHC_PREFIX)) {
      throw new UserDomainError('U-I3: passwordHash must be an argon2id PHC string');
    }
  }
}
