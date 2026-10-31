import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { ConsumerConfiguration } from '../domain/consumer-configuration';

describe('ConfigurationLoaderService', () => {
  let service: ConfigurationLoaderService;

  beforeEach(() => {
    service = new ConfigurationLoaderService();
  });

  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load configuration from environment variables', async () => {
    process.env.BROKER_URL = 'env://broker:1234';
    process.env.CACHE_URL = 'env://cache:5678';
    process.env.SUBSCRIPTION_TOPIC = 'env-topic';
    process.env.DLQ_TOPIC = 'env-dlq';
    process.env.MAX_RETRY_ATTEMPTS = '7';
    process.env.BASE_RETRY_DELAY_MS = '200';
    process.env.MAX_RETRY_DELAY_MS = '20000';

    const config = await service.loadConfiguration();

    expect(config).toBeInstanceOf(ConsumerConfiguration);
    expect(config.brokerUrl).toBe('env://broker:1234');
    expect(config.cacheUrl).toBe('env://cache:5678');
    expect(config.subscriptionTopic).toBe('env-topic');
    expect(config.deadLetterQueueTopic).toBe('env-dlq');
    expect(config.maxRetryAttempts).toBe(7);
    expect(config.baseRetryDelayMs).toBe(200);
    expect(config.maxRetryDelayMs).toBe(20000);
  });

  it('should use default values when environment variables are not set', async () => {
    // Clear relevant env vars
    delete process.env.BROKER_URL;
    delete process.env.CACHE_URL;
    delete process.env.SUBSCRIPTION_TOPIC;
    delete process.env.DLQ_TOPIC;
    delete process.env.MAX_RETRY_ATTEMPTS;
    delete process.env.BASE_RETRY_DELAY_MS;
    delete process.env.MAX_RETRY_DELAY_MS;

    const config = await service.loadConfiguration();

    expect(config).toBeInstanceOf(ConsumerConfiguration);
    expect(config.brokerUrl).toBe('redis://localhost:6379');
    expect(config.cacheUrl).toBe('redis://localhost:6380');
    expect(config.subscriptionTopic).toBe('entity-changes');
    expect(config.deadLetterQueueTopic).toBe('entity-changes-dlq');
    expect(config.maxRetryAttempts).toBe(3);
    expect(config.baseRetryDelayMs).toBe(1000);
    expect(config.maxRetryDelayMs).toBe(10000);
  });

  it('should handle errors gracefully with fallback', async () => {
    // Mock the fromEnv method to throw an error
    const originalFromEnv = ConsumerConfiguration.fromEnv;
    ConsumerConfiguration.fromEnv = () => {
      throw new Error('Failed to load configuration');
    };

    try {
      const config = await service.loadConfigurationWithFallback();

      expect(config).toBeInstanceOf(ConsumerConfiguration);
      expect(config.brokerUrl).toBe('redis://localhost:6379');
      expect(config.cacheUrl).toBe('redis://localhost:6380');
    } finally {
      // Restore the original method
      ConsumerConfiguration.fromEnv = originalFromEnv;
    }
  });
});
