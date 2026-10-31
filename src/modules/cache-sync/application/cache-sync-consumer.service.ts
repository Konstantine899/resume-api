import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EntityChangePublisher } from '../domain/entity-change-publisher';
import { CacheAdapter } from '../domain/cache-adapter';
import { CacheSyncMonitor } from '../domain/cache-sync-monitor';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { ConsumerConfiguration } from '../domain/consumer-configuration';
import { HotReloadConfigurationService } from './hot-reload-configuration.service';
import { CacheSyncEvent } from '../domain/cache-sync-event';
import { ProcessingResult } from '../domain/processing-result';
import { deserializeAndValidateEvent } from '../domain/event-deserializer';
import { generateCacheKey } from '../domain/cache-key-generator';
import { calculateExponentialBackoffWithJitter } from '../domain/exponential-backoff';

/**
 * Service responsible for consuming entity change events and synchronizing with cache
 * Implements the core cache synchronization logic for public site updates
 */
@Injectable()
export class CacheSyncConsumerService implements OnModuleInit, OnModuleDestroy {
  private config: ConsumerConfiguration;
  private readonly hotReloadConfig: HotReloadConfigurationService;
  private readonly entityChangePublisher: EntityChangePublisher;
  private readonly cacheAdapter: CacheAdapter;
  private readonly monitor: CacheSyncMonitor;
  private readonly signingKey: string;

  constructor(
    configLoader: ConfigurationLoaderService,
    hotReloadConfigService: HotReloadConfigurationService,
    entityChangePublisher: EntityChangePublisher,
    cacheAdapter: CacheAdapter,
    monitor: CacheSyncMonitor,
  ) {
    this.config = configLoader.loadConfigurationWithFallback();
    this.hotReloadConfig = hotReloadConfigService;
    this.entityChangePublisher = entityChangePublisher;
    this.cacheAdapter = cacheAdapter;
    this.monitor = monitor;
    this.signingKey =
      process.env.ENTITY_CHANGE_SIGNING_KEY || 'default-signing-key-change-in-production';

    console.log('CacheSyncConsumerService constructed with monitor:', !!this.monitor);
    console.log(
      'Monitor recordProcessedSuccess is function:',
      typeof this.monitor.recordProcessedSuccess === 'function',
    );
  }

  async onModuleInit() {
    // Start hot-reloading configuration
    await this.hotReloadConfig['onModuleInit']();

    // Set up configuration change listener
    this.hotReloadConfig.onConfigurationChange((newConfig) => {
      this.onConfigurationUpdate(newConfig);
    });
  }

  onModuleDestroy() {
    this.hotReloadConfig['onModuleDestroy']();
  }

  private onConfigurationUpdate(newConfig: ConsumerConfiguration): void {
    this.config = newConfig;
    // In a real implementation, you might need to reconnect to broker/cache with new settings
    this.monitor.recordProcessedSuccess('Configuration', 'UPDATE');
  }

  /**
   * Starts the consumer service - connects to message broker and begins listening for events
   */
  async start(): Promise<void> {
    try {
      // In a real implementation, this would connect to a message broker (RabbitMQ, Kafka, etc.)
      // and set up event listeners
      console.log(`CacheSyncConsumerService starting with broker: ${this.config.brokerUrl}`);
      console.log(`CacheSyncConsumerService connecting to cache: ${this.config.cacheUrl}`);

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start listening for events (in a real implementation, this would be event-driven)
      console.log(`CacheSyncConsumerService listening on topic: ${this.config.subscriptionTopic}`);

      this.monitor.recordProcessedSuccess('CacheSyncConsumerService', 'START');
    } catch (error) {
      this.monitor.recordProcessedFailure(
        'CacheSyncConsumerService',
        'START',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Handles incoming events from the message broker
   * @param rawEvent Raw event data received from the broker
   */
  async handleEvent(rawEvent: unknown): Promise<void> {
    const startTime = Date.now();

    try {
      // Deserialize and validate the incoming event
      const validationResult = deserializeAndValidateEvent(rawEvent);

      if (!validationResult.success) {
        this.monitor.recordProcessedFailure(
          'EventDeserialization',
          'VALIDATE',
          validationResult.errorMessage || 'Unknown error',
        );
        return;
      }

      // Extract the validated event from the result
      const event = validationResult.value as unknown as CacheSyncEvent;
      if (!event) {
        this.monitor.recordProcessedFailure(
          'EventDeserialization',
          'VALIDATE',
          'Failed to extract event from validation result',
        );
        return;
      }

      // Verify HMAC signature if present
      // In a real implementation, the signature would be in the message headers
      // const isValidSignature = verifyHmacSignature(JSON.stringify(event.payload), receivedSignature, this.signingKey);
      // if (!isValidSignature) {
      //   this.monitor.recordProcessedFailure('Security', 'SIGNATURE_VALIDATION', 'Invalid signature');
      //   return;
      // }

      // Process the event based on action type
      let result: ProcessingResult<null>;
      switch (event.action) {
        case 'CREATE':
          result = await this.handleCreateEvent(event);
          break;
        case 'UPDATE':
          result = await this.handleUpdateEvent(event);
          break;
        case 'DELETE':
          result = await this.handleDeleteEvent(event);
          break;
        default:
          result = ProcessingResult.failure(`Unsupported action: ${event.action}`);
      }

      // Record metrics based on processing result
      if (result.success) {
        console.log(`Recording success for ${event.entityType} ${event.action}`);
        console.log('Monitor is:', this.monitor);
        console.log('Monitor recordProcessedSuccess is:', this.monitor.recordProcessedSuccess);
        try {
          this.monitor.recordProcessedSuccess(event.entityType, event.action);
          console.log('SUCCESS: recordProcessedSuccess called');
        } catch (error) {
          console.log('ERROR calling recordProcessedSuccess:', error);
        }
        const latencyMs = Date.now() - startTime;
        console.log(`Recording latency ${latencyMs}ms for ${event.entityType} ${event.action}`);
        try {
          this.monitor.recordProcessingLatency(event.entityType, event.action, latencyMs);
          console.log('SUCCESS: recordProcessingLatency called');
        } catch (error) {
          console.log('ERROR calling recordProcessingLatency:', error);
        }
      } else {
        console.log(
          `Recording failure for ${event.entityType} ${event.action}: ${result.errorMessage}`,
        );
        this.monitor.recordProcessedFailure(
          event.entityType,
          event.action,
          result.errorMessage || 'Unknown error',
        );
        this.monitor.recordProcessedFailure(
          event.entityType,
          event.action,
          result.errorMessage || 'Unknown error',
        );

        // Handle retry logic if applicable
        if (result.retryCount !== undefined && result.retryCount < this.config.maxRetryAttempts) {
          // In a real implementation, we would re-queue the event with delay
          const delayMs = calculateExponentialBackoffWithJitter(
            result.retryCount,
            this.config.baseRetryDelayMs,
            this.config.maxRetryDelayMs,
          );
          console.log(
            `Retrying event ${event.id} in ${delayMs}ms (attempt ${result.retryCount + 1})`,
          );
          // Actual re-queuing would happen here
        } else {
          // Send to dead letter queue if max retries exceeded
          await this.sendToDeadLetterQueue(event);
          this.monitor.recordDeadLetterQueue(event.entityType, event.action);
        }
      }
    } catch (error) {
      this.monitor.recordProcessedFailure(
        'EventHandling',
        'EXCEPTION',
        error instanceof Error ? error.message : String(error),
      );
      console.error('Error handling event:', error);
    }
  }

  /**
   * Handles a CREATE entity event
   * @param event The cache sync event to process
   * @returns ProcessingResult indicating success or failure
   */
  private async handleCreateEvent(event: CacheSyncEvent): Promise<ProcessingResult<null>> {
    try {
      // Generate cache key for the entity
      const cacheKey = generateCacheKey(event.entityType, event.entityId);

      // In a real implementation, we would store the entity data in cache
      // await this.cacheAdapter.update(cacheKey, event.payload);

      // For demonstration, we'll simulate the cache operation
      console.log(`CACHE SET ${cacheKey}:`, event.payload);

      return ProcessingResult.success();
    } catch (error) {
      return ProcessingResult.failure(
        `Failed to create entity cache entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handles an UPDATE entity event
   * @param event The cache sync event to process
   * @returns ProcessingResult indicating success or failure
   */
  private async handleUpdateEvent(event: CacheSyncEvent): Promise<ProcessingResult<null>> {
    try {
      // Generate cache key for the entity
      const cacheKey = generateCacheKey(event.entityType, event.entityId);

      // In a real implementation, we would update the entity data in cache
      // await this.cacheAdapter.update(cacheKey, event.payload);

      // For demonstration, we'll simulate the cache operation
      console.log(`CACHE UPDATE ${cacheKey}:`, event.payload);

      return ProcessingResult.success();
    } catch (error) {
      return ProcessingResult.failure(
        `Failed to update entity cache entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Handles a DELETE entity event
   * @param event The cache sync event to process
   * @returns ProcessingResult indicating success or failure
   */
  private async handleDeleteEvent(event: CacheSyncEvent): Promise<ProcessingResult<null>> {
    try {
      // Generate cache key for the entity
      const cacheKey = generateCacheKey(event.entityType, event.entityId);

      // In a real implementation, we would remove the entity data from cache
      // await this.cacheAdapter.invalidate(cacheKey);

      // For demonstration, we'll simulate the cache operation
      console.log(`CACHE DEL ${cacheKey}:`);

      return ProcessingResult.success();
    } catch (error) {
      return ProcessingResult.failure(
        `Failed to delete entity cache entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Sends an event to the dead letter queue
   * @param event The event to send to DLQ
   */
  private async sendToDeadLetterQueue(event: CacheSyncEvent): Promise<void> {
    // In a real implementation, this would publish to a dead letter queue topic
    // await this.entityChangePublisher.publishEntityChange({
    //   ...event,
    //   action: 'DLQ',
    //   payload: { ...event.payload, originalAction: event.action }
    // });

    // For demonstration, we'll just log it
    console.log(`SENDING TO DLQ:`, {
      eventId: event.id,
      entityType: event.entityType,
      entityId: event.entityId,
      originalAction: event.action,
      payload: event.payload,
    });

    return Promise.resolve();
  }
}
