import { describe, expect, it } from 'vitest';
import { ProcessingResult } from './processing-result';

describe('ProcessingResult', () => {
  it('should create a success instance', () => {
    const result = ProcessingResult.success();

    expect(result.success).toBe(true);
    expect(result.value).toBeUndefined();
    expect(result.errorMessage).toBeUndefined();
    expect(result.retryCount).toBeUndefined();
  });

  it('should create a success instance with a value', () => {
    const result = ProcessingResult.success('test-value');

    expect(result.success).toBe(true);
    expect(result.value).toBe('test-value');
    expect(result.errorMessage).toBeUndefined();
    expect(result.retryCount).toBeUndefined();
  });

  it('should create a failure instance with error message', () => {
    const errorMessage = 'Something went wrong';
    const result = ProcessingResult.failure(errorMessage);

    expect(result.success).toBe(false);
    expect(result.value).toBeNull();
    expect(result.errorMessage).toBe(errorMessage);
    expect(result.retryCount).toBe(0);
  });

  it('should create a failure instance with error message and retry count', () => {
    const errorMessage = 'Temporary failure';
    const retryCount = 3;
    const result = ProcessingResult.failure(errorMessage, retryCount);

    expect(result.success).toBe(false);
    expect(result.value).toBeNull();
    expect(result.errorMessage).toBe(errorMessage);
    expect(result.retryCount).toBe(retryCount);
  });

  it('should create an instance via constructor directly', () => {
    const result = new ProcessingResult<null>(true, null, 'Optional error', 2);

    expect(result.success).toBe(true);
    expect(result.value).toBeNull();
    expect(result.errorMessage).toBe('Optional error');
    expect(result.retryCount).toBe(2);
  });

  it('should create an instance via constructor directly with a value', () => {
    const result = new ProcessingResult<string>(true, 'test-value', null, 0);

    expect(result.success).toBe(true);
    expect(result.value).toBe('test-value');
    expect(result.errorMessage).toBeNull();
    expect(result.retryCount).toBe(0);
  });
});
