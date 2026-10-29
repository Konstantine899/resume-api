export class ContentApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ContentNotFoundError extends ContentApplicationError {}
export class ContentConflictError extends ContentApplicationError {}

/**
 * Raised when `expectedUpdatedAt` does not match the stored `updatedAt`.
 * Used by `PUT /about` for the optimistic concurrency in plan WU-3/D8.
 */
export class AboutConflictError extends ContentConflictError {
  readonly conflicts: { currentUpdatedAt: string; key: 'concurrent-modification' };
  constructor(message: string, currentUpdatedAt: Date) {
    super(message);
    this.name = 'AboutConflictError';
    this.conflicts = {
      currentUpdatedAt: currentUpdatedAt.toISOString(),
      key: 'concurrent-modification',
    };
  }
}
export class ContentValidationError extends ContentApplicationError {}
