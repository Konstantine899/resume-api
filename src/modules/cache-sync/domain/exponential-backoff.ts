/**
 * Calculates the delay for exponential backoff with jitter
 * @param attemptNumber The current attempt number (starting from 0)
 * @param baseDelayMs The base delay in milliseconds
 * @param maxDelayMs The maximum delay in milliseconds
 * @returns The calculated delay in milliseconds
 */
export function calculateExponentialBackoffWithJitter(
  attemptNumber: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  if (attemptNumber < 0) {
    throw new Error('Attempt number must be non-negative');
  }

  if (baseDelayMs <= 0) {
    throw new Error('Base delay must be positive');
  }

  if (maxDelayMs <= 0) {
    throw new Error('Max delay must be positive');
  }

  if (maxDelayMs < baseDelayMs) {
    throw new Error('Max delay must be greater than or equal to base delay');
  }

  // Calculate exponential backoff: base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attemptNumber);

  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Apply jitter: random value between 50% and 100% of cappedDelay
  // This helps prevent thundering herd problem
  const jitterFactor = 0.5 + Math.random() * 0.5; // Between 0.5 and 1.0
  const jitteredDelay = cappedDelay * jitterFactor;

  return Math.floor(jitteredDelay);
}
