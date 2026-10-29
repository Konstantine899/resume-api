import { Injectable } from '@nestjs/common';
import { EntityChangePublisher } from '../domain/entity-change-publisher';
import { CacheSyncEvent } from '../domain/cache-sync-event';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { ConsumerConfiguration } from '../domain/consumer-configuration';
import { verifyHmacSignature, generateHmacSignature } from '../domain/signature-verifier';

/**
 * Example implementation of EntityChangePublisher for origin services
 * This shows how an origin service (auth, content, media, users) would
 * publish entity changes to synchronize with the public site cache
 */
@Injectable()
export class OriginServiceEntityChangePublisher implements EntityChangePublisher {
  private readonly config: ConsumerConfiguration;
  private readonly signingKey: string;

  constructor(private readonly configLoader: ConfigurationLoaderService) {
    this.config = configLoader.loadConfigurationWithFallback();
    // In a real implementation, this would come from secure configuration
    this.signingKey =
      process.env.ENTITY_CHANGE_SIGNING_KEY || 'default-signing-key-change-in-production';
  }

  async publishEntityChange(event: CacheSyncEvent): Promise<void> {
    try {
      // Serialize the event to JSON string
      const payload = JSON.stringify({
        id: event.id,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        payload: event.payload,
        timestamp: event.timestamp.toISOString(),
        correlationId: event.correlationId,
      });

      // Generate HMAC-SHA256 signature for security
      const signature = generateHmacSignature(payload, this.signingKey);

      // In a real implementation, this would publish to a message broker
      // like RabbitMQ, Apache Kafka, or AWS SNS/SQS
      // For this example, we'll simulate the publishing process

      console.log(`Publishing entity change event:`, {
        eventId: event.id,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        // Don't log the full payload for brevity/security
        hasPayload: !!event.payload,
        signature: signature.substring(0, 16) + '...', // Show only beginning of signature
      });

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      // In a real implementation, you would actually send the message here
      // For example:
      // await this.messageBroker.publish('entity-changes', {
      //   payload,
      //   signature,
      //   headers: { 'content-type': 'application/json', 'signature': signature }
      // });
    } catch (error) {
      console.error('Failed to publish entity change event:', error);
      throw error;
    }
  }

  /**
   * Verifies that a received event signature is valid
   * Utility method for consumer services to verify origin authenticity
   */
  static verifyEventSignature(payload: string, signature: string, signingKey: string): boolean {
    return verifyHmacSignature(payload, signature, signingKey);
  }
}
