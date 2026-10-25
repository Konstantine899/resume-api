/** Base class for errors raised by the auth domain. */
export class AuthDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a domain invariant (I1/I2) would be violated. */
export class InvariantViolationError extends AuthDomainError {}
