/**
 * Interface defining the contract for cache synchronization monitoring
 * Different implementations can be plugged in (Prometheus, Datadog, etc.)
 */
export interface CacheSyncMonitor {
  /**
   * Records that an event was successfully processed
   * @param entityType The type of entity that was processed
   * @param action The action that was performed (CREATE, UPDATE, DELETE)
   */
  recordProcessedSuccess(entityType: string, action: string): void;

  /**
   * Records that an event failed to be processed
   * @param entityType The type of entity that failed processing
   * @param action The action that was attempted (CREATE, UPDATE, DELETE)
   * @param errorMessage The error message describing the failure
   */
  recordProcessedFailure(entityType: string, action: string, errorMessage: string): void;

  /**
   * Records the latency of processing an event
   * @param entityType The type of entity that was processed
   * @param action The action that was performed (CREATE, UPDATE, DELETE)
   * @param latencyMs The processing latency in milliseconds
   */
  recordProcessingLatency(entityType: string, action: string, latencyMs: number): void;

  /**
   * Records that an event was sent to the dead letter queue
   * @param entityType The type of entity that was sent to DLQ
   * @param action The action that was attempted (CREATE, UPDATE, DELETE)
   */
  recordDeadLetterQueue(entityType: string, action: string): void;

  /**
   * Records the current lag in event processing
   * @param lagMs The lag in milliseconds (time since last processed event)
   */
  recordEventLag(lagMs: number): void;

  /**
   * Records the current retry count for an event being processed
   * @param entityType The type of entity being processed
   * @param retryCount The current retry attempt number
   */
  recordRetryCount(entityType: string, retryCount: number): void;
}
