/** Application-level errors of the auth context; presentation maps them to HTTP. */
export class AuthApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Wrong password OR unknown account — always the same message (SPEC C2). */
export class InvalidCredentialsError extends AuthApplicationError {}

/** Unknown / expired / revoked refresh token, reuse, dead family (SPEC C6). */
export class InvalidSessionError extends AuthApplicationError {}

/** Thrown when a public registration targets an email already in use. */
export class EmailAlreadyRegisteredError extends AuthApplicationError {}
