import { CacheSyncEvent } from './cache-sync-event';

/**
 * Interface for publishing entity change events to synchronize caches
 */
export interface EntityChangePublisher {
  /**
   * Publishes an entity change event
   * @param event The entity change event to publish
   * @returns Promise that resolves when the event has been published
   */
  publishEntityChange(event: CacheSyncEvent): Promise<void>;
}
