import { randomUUID } from 'node:crypto';

/** The roles that can be assigned to an account. */
export type UserRole = 'admin' | 'user';

/** Theme preference values stored on `User.theme`. */
export type UserTheme = 'light' | 'dark';
/** Language preference values stored on `User.language`. */
export type UserLanguage = 'en' | 'ru';
export const ADMIN_ROLE: UserRole = 'admin';
export const USER_ROLE: UserRole = 'user';

const LOOSE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const ARGON2ID_PHC_PREFIX = '$argon2id$';

export interface UserProps {
  id: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  theme: UserTheme;
  language: UserLanguage;
  createdAt: Date;
}

export class UserDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDomainError';
  }
}

/** Raised when a unique constraint (email) is violated on persistence. */
export class UserEmailConflictError extends Error {
  constructor() {
    super('User email already exists');
    this.name = 'UserEmailConflictError';
  }
}

/**
 * Aggregate root of the users context (users/spec/SPEC.md §1).
 * Invariants:
 *  U-I1 — email is normalized (trim + lowercase), non-empty and valid;
 *  U-I2 — the role can only be `admin` or `user`;
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

  /** Creates the admin account (seed-only creation path). */
  static createAdmin(input: {
    email: string;
    passwordHash: string;
    id?: string;
    theme?: UserTheme;
    language?: UserLanguage;
  }): User {
    const email = User.normalizeEmail(input.email);
    User.assertEmail(email);
    User.assertPasswordHash(input.passwordHash);
    return new User({
      id: input.id ?? randomUUID(),
      email,
      role: ADMIN_ROLE,
      passwordHash: input.passwordHash,
      theme: input.theme ?? 'dark',
      language: input.language ?? 'ru',
      createdAt: new Date(),
    });
  }

  /** Creates a registered (public) user; role is hard-coded to `user`. */
  static createRegisteredUser(input: {
    email: string;
    passwordHash: string;
    id?: string;
    theme?: UserTheme;
    language?: UserLanguage;
  }): User {
    const email = User.normalizeEmail(input.email);
    User.assertEmail(email);
    User.assertPasswordHash(input.passwordHash);
    return new User({
      id: input.id ?? randomUUID(),
      email,
      role: USER_ROLE,
      passwordHash: input.passwordHash,
      theme: input.theme ?? 'dark',
      language: input.language ?? 'ru',
      createdAt: new Date(),
    });
  }

  /** Re-hydrates a stored row, re-checking every invariant. */
  static reconstitute(props: UserProps): User {
    User.assertEmail(props.email);
    return new User({
      ...props,
      theme: props.theme ?? 'dark',
      language: props.language ?? 'ru',
    });
  }

  /** Mutates the stored preference columns. */
  changePreferences(input: { theme?: UserTheme; language?: UserLanguage }): void {
    if (input.theme !== undefined) {
      this.props.theme = input.theme;
    }
    if (input.language !== undefined) {
      this.props.language = input.language;
    }
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

  get theme(): UserTheme {
    return this.props.theme;
  }

  get language(): UserLanguage {
    return this.props.language;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** Seed-only mutation: rotate the stored password hash. */
  changePassword(passwordHash: string): void {
    User.assertPasswordHash(passwordHash);
    this.props.passwordHash = passwordHash;
  }

  private static assertPasswordHash(passwordHash: string): void {
    if (!passwordHash.startsWith(ARGON2ID_PHC_PREFIX)) {
      throw new UserDomainError('U-I3: passwordHash must be an argon2id PHC string');
    }
  }
}
