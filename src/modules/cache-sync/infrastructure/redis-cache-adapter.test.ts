import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RedisCacheAdapter } from './redis-cache-adapter';

describe('RedisCacheAdapter', () => {
  let adapter: RedisCacheAdapter;

  beforeEach(() => {
    adapter = new RedisCacheAdapter();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  it('should implement CacheAdapter interface', () => {
    expect(typeof adapter.update).toBe('function');
    expect(typeof adapter.invalidate).toBe('function');
    expect(typeof adapter.get).toBe('function');
  });

  it('should log when updating a cache entry', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await adapter.update('test-key', { test: 'value' }, 1800);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Redis SET test-key (TTL: 1800s):'),
      { test: 'value' },
    );

    consoleSpy.mockRestore();
  });

  it('should log when updating a cache entry without TTL', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await adapter.update('test-key', [1, 2, 3]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Redis SET test-key:'),
      [1, 2, 3],
    );

    consoleSpy.mockRestore();
  });

  it('should log when invalidating a cache entry', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await adapter.invalidate('test-key');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Redis DEL test-key:'));

    consoleSpy.mockRestore();
  });

  it('should log when getting a cache entry and return null (cache miss)', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const result = await adapter.get<string>('non-existent-key');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Redis GET non-existent-key: (cache miss)'),
    );

    expect(result).toBe(null);

    consoleSpy.mockRestore();
  });
});
