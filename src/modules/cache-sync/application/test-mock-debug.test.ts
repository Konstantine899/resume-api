import { describe, expect, it, vi } from 'vitest';

describe('Mock debug test', () => {
  it('should track mock function calls', () => {
    const mock = vi.fn();

    mock('arg1', 'arg2');

    expect(mock).toHaveBeenCalled();
    expect(mock).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
