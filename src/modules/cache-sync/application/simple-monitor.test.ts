import { describe, expect, it, vi } from 'vitest';

// Simple test to verify vi.fn() works in this context
describe('Simple mock test', () => {
  it('should track function calls', () => {
    const mock = vi.fn();

    mock('hello', 'world');

    expect(mock).toHaveBeenCalled();
    expect(mock).toHaveBeenCalledWith('hello', 'world');
  });
});
