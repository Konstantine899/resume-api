export class ProcessingResult<T = null> {
  constructor(
    public readonly success: boolean,
    public readonly value?: T,
    public readonly errorMessage?: string | null,
    public readonly retryCount?: number,
  ) {}

  static success<T>(value?: T): ProcessingResult<T> {
    return new ProcessingResult<T>(true, value);
  }

  static failure(errorMessage: string, retryCount = 0): ProcessingResult<null> {
    return new ProcessingResult<null>(false, null, errorMessage, retryCount);
  }
}
