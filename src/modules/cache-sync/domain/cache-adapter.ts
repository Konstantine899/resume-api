/**
 * Interface defining the contract for cache adapters
 * Different implementations can be plugged in (Redis, Memcached, etc.)
 */
export interface CacheAdapter {
  /**
   * Updates or sets a value in the cache
   * @param key The cache key
   * @param value The value to store
   * @param ttlSeconds Optional time-to-live in seconds
   * @returns Promise that resolves when the operation completes
   */
  update(key: string, value: unknown, ttlSeconds?: number): Promise<void>;

  /**
   * Invalidates (removes) a value from the cache
   * @param key The cache key to remove
   * @returns Promise that resolves when the operation completes
   */
  invalidate(key: string): Promise<void>;

  /**
   * Retrieves a value from the cache
   * @param key The cache key to retrieve
   * @returns Promise that resolves with the cached value or null if not found
   */
  get<T = unknown>(key: string): Promise<T | null>;
}
