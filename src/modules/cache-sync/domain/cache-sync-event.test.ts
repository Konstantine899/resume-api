import { describe, expect, it } from 'vitest';
import { CacheSyncEvent } from './cache-sync-event';

describe('CacheSyncEvent', () => {
  it('should create an instance with correct properties', () => {
    const id = 'test-id';
    const entityType = 'User';
    const entityId = 'user-123';
    const action = 'CREATE';
    const payload = { name: 'John Doe', email: 'john@example.com' };
    const timestamp = new Date();
    const correlationId = 'corr-123';

    const event = new CacheSyncEvent(
      id,
      entityType,
      entityId,
      action,
      payload,
      timestamp,
      correlationId,
    );

    expect(event.id).toBe(id);
    expect(event.entityType).toBe(entityType);
    expect(event.entityId).toBe(entityId);
    expect(event.action).toBe(action);
    expect(event.payload).toBe(payload);
    expect(event.timestamp).toBe(timestamp);
    expect(event.correlationId).toBe(correlationId);
  });

  it('should create an instance without correlationId', () => {
    const event = new CacheSyncEvent(
      'test-id',
      'User',
      'user-123',
      'UPDATE',
      { name: 'Jane Doe' },
      new Date(),
    );

    expect(event.correlationId).toBeUndefined();
  });
});
