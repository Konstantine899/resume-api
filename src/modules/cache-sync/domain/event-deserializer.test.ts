import { describe, expect, it } from 'vitest';
import { deserializeAndValidateEvent } from './event-deserializer';

describe('deserializeAndValidateEvent', () => {
  const validEvent = {
    id: 'test-event-id',
    entityType: 'User',
    entityId: 'user-123',
    action: 'CREATE',
    payload: { name: 'John Doe', email: 'john@example.com' },
    timestamp: new Date().toISOString(),
    correlationId: 'corr-123',
  };

  it('should successfully deserialize a valid event', () => {
    const result = deserializeAndValidateEvent(validEvent);

    expect(result.success).toBe(true);
    expect(result.errorMessage).toBeUndefined();
  });

  it('should reject non-object input', () => {
    expect(deserializeAndValidateEvent(null).success).toBe(false);
    expect(deserializeAndValidateEvent(undefined).success).toBe(false);
    expect(deserializeAndValidateEvent('string').success).toBe(false);
    expect(deserializeAndValidateEvent(123).success).toBe(false);
    expect(deserializeAndValidateEvent([]).success).toBe(false);
  });

  it('should reject missing or invalid id', () => {
    expect(deserializeAndValidateEvent({ ...validEvent, id: '' }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, id: null }).success).toBe(false);
    // Test missing id property by creating object without id
    const eventWithoutId: Partial<typeof validEvent> = { ...validEvent };
    delete eventWithoutId.id;
    expect(deserializeAndValidateEvent(eventWithoutId).success).toBe(false);
  });

  it('should reject missing or invalid entityType', () => {
    expect(deserializeAndValidateEvent({ ...validEvent, entityType: '' }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, entityType: null }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, entityType: 123 }).success).toBe(false);
  });

  it('should reject missing or invalid entityId', () => {
    expect(deserializeAndValidateEvent({ ...validEvent, entityId: '' }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, entityId: null }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, entityId: 123 }).success).toBe(false);
  });

  it('should reject invalid action', () => {
    expect(deserializeAndValidateEvent({ ...validEvent, action: 'INVALID' }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, action: 'create' }).success).toBe(false); // wrong case
    expect(deserializeAndValidateEvent({ ...validEvent, action: null }).success).toBe(false);
  });

  it('should reject invalid payload', () => {
    expect(deserializeAndValidateEvent({ ...validEvent, payload: null }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, payload: 'string' }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, payload: 123 }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, payload: [] }).success).toBe(false);
  });

  it('should reject invalid timestamp', () => {
    expect(deserializeAndValidateEvent({ ...validEvent, timestamp: 'invalid-date' }).success).toBe(
      false,
    );
    expect(deserializeAndValidateEvent({ ...validEvent, timestamp: NaN }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, timestamp: null }).success).toBe(false);
  });

  it('should reject invalid correlationId when provided', () => {
    expect(deserializeAndValidateEvent({ ...validEvent, correlationId: 123 }).success).toBe(false);
    expect(deserializeAndValidateEvent({ ...validEvent, correlationId: [] }).success).toBe(false);
  });

  it('should accept event without correlationId', () => {
    const eventWithoutCorrId: Partial<typeof validEvent> = { ...validEvent };
    delete eventWithoutCorrId.correlationId;

    const result = deserializeAndValidateEvent(eventWithoutCorrId);
    expect(result.success).toBe(true);
  });

  it('should handle timestamp as Date object', () => {
    const eventWithDateObj = {
      ...validEvent,
      timestamp: new Date(),
    };

    const result = deserializeAndValidateEvent(eventWithDateObj);
    expect(result.success).toBe(true);
  });

  it('should handle timestamp as numeric timestamp', () => {
    const eventWithNumericTs = {
      ...validEvent,
      timestamp: Date.now(),
    };

    const result = deserializeAndValidateEvent(eventWithNumericTs);
    expect(result.success).toBe(true);
  });
});
