import { describe, expect, it } from 'vitest';
import { calculateExponentialBackoffWithJitter } from './exponential-backoff';

describe('calculateExponentialBackoffWithJitter', () => {
  it('should throw error for negative attempt number', () => {
    expect(() => calculateExponentialBackoffWithJitter(-1, 100, 10000)).toThrow(
      'Attempt number must be non-negative',
    );
  });

  it('should throw error for non-positive base delay', () => {
    expect(() => calculateExponentialBackoffWithJitter(0, 0, 10000)).toThrow(
      'Base delay must be positive',
    );
    expect(() => calculateExponentialBackoffWithJitter(0, -1, 10000)).toThrow(
      'Base delay must be positive',
    );
  });

  it('should throw error for non-positive max delay', () => {
    expect(() => calculateExponentialBackoffWithJitter(0, 100, 0)).toThrow(
      'Max delay must be positive',
    );
    expect(() => calculateExponentialBackoffWithJitter(0, 100, -1)).toThrow(
      'Max delay must be positive',
    );
  });

  it('should throw error for max delay less than base delay', () => {
    expect(() => calculateExponentialBackoffWithJitter(0, 200, 100)).toThrow(
      'Max delay must be greater than or equal to base delay',
    );
  });

  it('should calculate correct delay for attempt 0', () => {
    // For attempt 0: baseDelayMs * 2^0 = baseDelayMs
    // With jitter between 0.5 and 1.0: result between baseDelayMs*0.5 and baseDelayMs*1.0
    const baseDelayMs = 1000;
    const maxDelayMs = 10000;
    const delay = calculateExponentialBackoffWithJitter(0, baseDelayMs, maxDelayMs);

    expect(delay).toBeGreaterThanOrEqual(baseDelayMs * 0.5);
    expect(delay).toBeLessThanOrEqual(baseDelayMs);
  });

  it('should calculate correct delay for attempt 1', () => {
    // For attempt 1: baseDelayMs * 2^1 = baseDelayMs * 2
    // With jitter between 0.5 and 1.0: result between baseDelayMs*2*0.5 and baseDelayMs*2*1.0
    const baseDelayMs = 1000;
    const maxDelayMs = 10000;
    const delay = calculateExponentialBackoffWithJitter(1, baseDelayMs, maxDelayMs);

    expect(delay).toBeGreaterThanOrEqual(baseDelayMs * 2 * 0.5);
    expect(delay).toBeLessThanOrEqual(baseDelayMs * 2);
  });

  it('should cap at max delay', () => {
    // For attempt 10: baseDelayMs * 2^10 = 1000 * 1024 = 1,024,000
    // Which is greater than maxDelayMs of 10000, so it should be capped
    const baseDelayMs = 1000;
    const maxDelayMs = 10000;
    const delay = calculateExponentialBackoffWithJitter(10, baseDelayMs, maxDelayMs);

    // With jitter applied to the capped value
    expect(delay).toBeGreaterThanOrEqual(maxDelayMs * 0.5);
    expect(delay).toBeLessThanOrEqual(maxDelayMs);
  });

  it('should return different values due to jitter', () => {
    const baseDelayMs = 1000;
    const maxDelayMs = 10000;
    const attempts = 5;

    const delays = [];
    for (let i = 0; i < attempts; i++) {
      delays.push(calculateExponentialBackoffWithJitter(i, baseDelayMs, maxDelayMs));
    }

    // With high probability, not all delays will be the same due to jitter
    // We'll check that at least some are different
    const uniqueDelays = new Set(delays);
    expect(uniqueDelays.size).toBeGreaterThan(1);
  });
});
