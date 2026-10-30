import { describe, expect, it } from 'vitest';
import { generateCacheKey } from './cache-key-generator';

describe('generateCacheKey', () => {
  it('should generate a cache key with default namespace', () => {
    const key = generateCacheKey('User', '123');
    expect(key).toBe('public-site:user:123');
  });

  it('should generate a cache key with custom namespace', () => {
    const key = generateCacheKey('Project', '456', 'preview-cache');
    expect(key).toBe('preview-cache:project:456');
  });

  it('should throw error for empty entity type', () => {
    expect(() => generateCacheKey('', '123')).toThrow('Entity type and ID must be provided');
    expect(() => generateCacheKey('   ', '123')).toThrow(
      'Entity type and ID must not be empty after trimming',
    );
  });

  it('should throw error for empty entity ID', () => {
    expect(() => generateCacheKey('User', '')).toThrow('Entity type and ID must be provided');
    expect(() => generateCacheKey('User', '   ')).toThrow(
      'Entity type and ID must not be empty after trimming',
    );
  });

  it('should handle special characters in entity type and ID', () => {
    const key = generateCacheKey('User-Profile', 'user_123-test');
    expect(key).toBe('public-site:user-profile:user_123-test');
  });

  it('should convert entity type to lowercase', () => {
    const key = generateCacheKey('USER', '123');
    expect(key).toBe('public-site:user:123');
  });
});
