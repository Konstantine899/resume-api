import crypto from 'crypto';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { OriginServiceEntityChangePublisher } from './entity-change-publisher.service';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { CacheSyncEvent } from '../domain/cache-sync-event';

describe('OriginServiceEntityChangePublisher', () => {
  let publisher: OriginServiceEntityChangePublisher;
  let configLoader: ConfigurationLoaderService;

  const originalEnv = process.env;

  beforeEach(() => {
    configLoader = new ConfigurationLoaderService();
    publisher = new OriginServiceEntityChangePublisher(configLoader);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(publisher).toBeDefined();
  });

  it('should implement EntityChangePublisher interface', () => {
    expect(typeof publisher.publishEntityChange).toBe('function');
  });

  it('should publish an entity change event', async () => {
    // Arrange
    process.env.ENTITY_CHANGE_SIGNING_KEY = 'test-signing-key';

    const event = new CacheSyncEvent(
      'test-event-123',
      'User',
      'user-456',
      'UPDATE',
      { email: 'updated@example.com' },
      new Date('2026-01-01T12:00:00Z'),
      'corr-789',
    );

    // Act
    await publisher.publishEntityChange(event);

    // Assert - if we get here without throwing, the publish succeeded
    // In a real test with a mock message broker, we would verify the message was sent
    expect(true).toBe(true);
  });

  it('should handle missing signing key gracefully', async () => {
    // Remove the signing key to test fallback
    delete process.env.ENTITY_CHANGE_SIGNING_KEY;

    const event = new CacheSyncEvent(
      'test-event-456',
      'Project',
      'proj-123',
      'DELETE',
      {},
      new Date(),
    );

    // Should not throw even with default signing key
    await publisher.publishEntityChange(event);
    expect(true).toBe(true);
  });

  it('should verify event signatures correctly', () => {
    const payload = '{"test":"data"}';
    const signingKey = 'test-key';
    const signature = crypto.createHmac('sha256', signingKey).update(payload).digest('hex');

    const isValid = OriginServiceEntityChangePublisher.verifyEventSignature(
      payload,
      signature,
      signingKey,
    );

    expect(isValid).toBe(true);
  });

  it('should reject invalid event signatures', () => {
    const payload = '{"test":"data"}';
    const signingKey = 'test-key';
    const invalidSignature = 'invalid-signature';

    const isValid = OriginServiceEntityChangePublisher.verifyEventSignature(
      payload,
      invalidSignature,
      signingKey,
    );

    expect(isValid).toBe(false);
  });
});
