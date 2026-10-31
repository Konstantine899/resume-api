import { describe, expect, it, vi } from 'vitest';
import { CacheAdapter } from './cache-adapter';

describe('CacheAdapter', () => {
  it('should define the required methods', () => {
    // Create a mock implementation to test the interface shape
    class MockAdapter implements CacheAdapter {
      update = vi.fn();
      invalidate = vi.fn();
      get = vi.fn();
    }

    const adapter = new MockAdapter();
    expect(typeof adapter.update).toBe('function');
    expect(typeof adapter.invalidate).toBe('function');
    expect(typeof adapter.get).toBe('function');
  });

  it('should allow instantiation of classes that implement the interface', () => {
    class TestAdapter implements CacheAdapter {
      async update(_key: string, _value: unknown, _ttlSeconds?: number): Promise<void> {
        void _key;
        void _value;
        void _ttlSeconds;
        return Promise.resolve();
      }

      async invalidate(_key: string): Promise<void> {
        void _key;
        return Promise.resolve();
      }

      async get<T = unknown>(_key: string): Promise<T | null> {
        void _key;
        return Promise.resolve(null);
      }
    }

    expect(() => new TestAdapter()).not.toThrow();
  });

  it('should accept correct parameter types', async () => {
    const updateMock = vi.fn();
    const invalidateMock = vi.fn();
    const getMock = vi
      .fn<(key: string) => Promise<string | null>>()
      .mockResolvedValue('test-value');

    class TestAdapter implements CacheAdapter {
      update = updateMock;
      invalidate = invalidateMock;
      async get<T = unknown>(key: string): Promise<T | null> {
        return getMock(key) as Promise<T | null>;
      }
    }

    const adapter = new TestAdapter();

    // Test update method
    await adapter.update('test-key', 'test-value', 3600);
    expect(updateMock).toHaveBeenCalledWith('test-key', 'test-value', 3600);

    // Test invalidate method
    await adapter.invalidate('test-key');
    expect(invalidateMock).toHaveBeenCalledWith('test-key');

    // Test get method
    const result = await adapter.get<string>('test-key');
    expect(getMock).toHaveBeenCalledWith('test-key');
    expect(result).toBe('test-value');
  });
});
