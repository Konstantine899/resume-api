export class ContentApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ContentNotFoundError extends ContentApplicationError {}
export class ContentConflictError extends ContentApplicationError {}
export class ContentValidationError extends ContentApplicationError {}
