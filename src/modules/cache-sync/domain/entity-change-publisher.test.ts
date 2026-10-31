import { describe, expect, it, vi } from 'vitest';
import { EntityChangePublisher } from './entity-change-publisher';
import { CacheSyncEvent } from './cache-sync-event';

describe('EntityChangePublisher', () => {
  it('should define the publishEntityChange method', () => {
    // Create a mock implementation to test the interface shape
    class MockPublisher implements EntityChangePublisher {
      publishEntityChange = vi.fn();
    }

    const publisher = new MockPublisher();
    expect(typeof publisher.publishEntityChange).toBe('function');
  });

  it('should allow instantiation of classes that implement the interface', () => {
    // TypeScript interfaces are compile-time contracts, not runtime enforcers
    class TestPublisher implements EntityChangePublisher {
      publishEntityChange() {
        return Promise.resolve();
      }
    }

    // This should not throw - the class implements the interface
    expect(() => new TestPublisher()).not.toThrow();
  });

  it('should accept a CacheSyncEvent parameter', async () => {
    const mockFn = vi.fn();
    class TestPublisher implements EntityChangePublisher {
      publishEntityChange = mockFn;
    }

    const publisher = new TestPublisher();
    const event = new CacheSyncEvent(
      'test-id',
      'User',
      'user-123',
      'CREATE',
      { name: 'Test User' },
      new Date(),
    );

    await publisher.publishEntityChange(event);

    expect(mockFn).toHaveBeenCalledWith(event);
  });
});
