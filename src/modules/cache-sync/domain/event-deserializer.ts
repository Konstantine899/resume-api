import { CacheSyncEvent } from './cache-sync-event';
import { ProcessingResult } from './processing-result';

/**
 * Deserializes and validates raw event data into a CacheSyncEvent instance
 * @param rawEvent Raw event data received from the message broker
 * @returns ProcessingResult containing either the deserialized event or error information
 */
export function deserializeAndValidateEvent(
  rawEvent: unknown,
): ProcessingResult<CacheSyncEvent | null> {
  try {
    // Check if rawEvent is an object
    if (!rawEvent || typeof rawEvent !== 'object') {
      return ProcessingResult.failure('Event data must be a non-null object');
    }

    const event = rawEvent as Record<string, unknown>;

    // Validate required fields
    const id = event.id;
    if (typeof id !== 'string' || !id) {
      return ProcessingResult.failure('Event must have a non-empty string id');
    }

    const entityType = event.entityType;
    if (typeof entityType !== 'string' || !entityType) {
      return ProcessingResult.failure('Event must have a non-empty string entityType');
    }

    const entityId = event.entityId;
    if (typeof entityId !== 'string' || !entityId) {
      return ProcessingResult.failure('Event must have a non-empty string entityId');
    }

    const action = event.action;
    const validActions = ['CREATE', 'UPDATE', 'DELETE'] as const;
    if (
      typeof action !== 'string' ||
      !validActions.includes(action as 'CREATE' | 'UPDATE' | 'DELETE')
    ) {
      return ProcessingResult.failure(`Event action must be one of ${validActions.join(', ')}`);
    }

    const payload = event.payload;
    if (
      payload === undefined ||
      payload === null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      return ProcessingResult.failure('Event must have a payload object');
    }

    const timestamp = event.timestamp;
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const timestampNum = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
      if (isNaN(timestampNum)) {
        return ProcessingResult.failure('Event timestamp must be a valid date or timestamp');
      }
      date = new Date(timestampNum);
    } else {
      return ProcessingResult.failure('Event must have a valid timestamp');
    }

    const correlationId = event.correlationId;
    if (
      correlationId !== undefined &&
      correlationId !== null &&
      typeof correlationId !== 'string'
    ) {
      return ProcessingResult.failure('Event correlationId must be a string if provided');
    }

    // If all validations pass, create the CacheSyncEvent instance
    const cacheSyncEvent = new CacheSyncEvent(
      id,
      entityType,
      entityId,
      action as 'CREATE' | 'UPDATE' | 'DELETE',
      payload as Record<string, unknown>,
      date,
      correlationId as string | undefined,
    );

    return ProcessingResult.success(cacheSyncEvent);
  } catch (error) {
    return ProcessingResult.failure(
      `Failed to deserialize event: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
