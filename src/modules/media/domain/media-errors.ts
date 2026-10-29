// Domain-level media failures. The RFC 7807 filter maps them by name:
// - `*DomainError`  -> 400 (invalid input / policy)
// - `*NotFoundError` -> 404
// - `*ConflictError` -> 409
// - the three explicit media names below carry their own HTTP status.

export class MediaTooSmallDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaTooSmallDomainError';
  }
}

export class MediaCorruptDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaCorruptDomainError';
  }
}

export class MediaPixelLimitDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaPixelLimitDomainError';
  }
}

/** Unsupported MIME/format for the requested kind -> 415. */
export class UnsupportedMediaFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMediaFormatError';
  }
}

/** Storage is out of space -> 507. */
export class MediaStorageFullError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaStorageFullError';
  }
}

/** Storage rejected the write (EACCES/EPERM) -> 403. */
export class MediaStorageAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaStorageAccessError';
  }
}

/** The key is still referenced by a document -> 409. */
export class MediaConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaConflictError';
  }
}

export class MediaNotFoundError extends Error {
  constructor(message = 'media not found') {
    super(message);
    this.name = 'MediaNotFoundError';
  }
}
