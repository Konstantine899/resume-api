import { Injectable } from '@nestjs/common';
import { CacheAdapter } from '../domain/cache-adapter';

/**
 * Memcached implementation of the CacheAdapter interface
 * In a real implementation, this would use a Memcached client library
 *
 * Example real implementation would look like:
 * import Memcached from 'memcached';
 *
 * @Injectable()
 * export class MemcachedCacheAdapter implements CacheAdapter {
 *   private readonly client: Memcached;
 *
 *   constructor() {
 *     this.client = new Memcached(process.env.MEMCACHED_SERVERS || 'localhost:11211');
 *   }
 *
 *   async update(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
 *     return new Promise((resolve, reject) => {
 *       this.client.set(key, JSON.stringify(value), ttlSeconds || 0, (err) => {
 *         if (err) return reject(err);
 *         resolve();
 *       });
 *     });
 *   }
 *
 *   async invalidate(key: string): Promise<void> {
 *     return new Promise((resolve, reject) => {
 *       this.client.del(key, (err) => {
 *         if (err) return reject(err);
 *         resolve();
 *       });
 *     });
 *   }
 *
 *   async get<T = unknown>(key: string): Promise<T | null> {
 *     return new Promise((resolve, reject) => {
 *       this.client.get(key, (err, data) => {
 *         if (err) return reject(err);
 *         resolve(data ? JSON.parse(data) as T : null);
 *       });
 *     });
 *   }
 * }
 */

@Injectable()
export class MemcachedCacheAdapter implements CacheAdapter {
  /**
   * Updates or sets a value in the cache
   * @param key The cache key
   * @param value The value to store
   * @param ttlSeconds Optional time-to-live in seconds
   * @returns Promise that resolves when the operation completes
   */
  async update(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    // In a real implementation with a Memcached client:
    // return new Promise((resolve, reject) => {
    //   this.client.set(key, JSON.stringify(value), ttlSeconds || 0, (err) => {
    //     if (err) return reject(err);
    //     resolve();
    //   });
    // });

    // For demonstration purposes, we'll simulate the operation
    console.log(
      `Memcached SET ${key}${ttlSeconds !== undefined ? ` (TTL: ${ttlSeconds}s)` : ''}:`,
      value,
    );
    return Promise.resolve();
  }

  /**
   * Invalidates (removes) a value from the cache
   * @param key The cache key to remove
   * @returns Promise that resolves when the operation completes
   */
  async invalidate(key: string): Promise<void> {
    // In a real implementation with a Memcached client:
    // return new Promise((resolve, reject) => {
    //   this.client.del(key, (err) => {
    //     if (err) return reject(err);
    //     resolve();
    //   });
    // });

    // For demonstration purposes, we'll simulate the operation
    console.log(`Memcached DEL ${key}:`);
    return Promise.resolve();
  }

  /**
   * Retrieves a value from the cache
   * @param key The cache key to retrieve
   * @returns Promise that resolves with the cached value or null if not found
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    // In a real implementation with a Memcached client:
    // return new Promise((resolve, reject) => {
    //   this.client.get(key, (err, data) => {
    //     if (err) return reject(err);
    //     resolve(data ? JSON.parse(data) as T : null);
    //   });
    // });

    // For demonstration purposes, we'll simulate a cache miss
    console.log(`Memcached GET ${key}: (cache miss)`);
    return Promise.resolve(null);
  }
}
