export class ContentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentDomainError';
  }
}
