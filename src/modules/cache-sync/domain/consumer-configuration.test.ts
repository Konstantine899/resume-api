import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { ConsumerConfiguration } from './consumer-configuration';

describe('ConsumerConfiguration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should read current environment variables', () => {
    process.env.BROKER_URL = 'test://broker:123';
    process.env.CACHE_URL = 'test://cache:456';

    const config = ConsumerConfiguration.fromEnv();

    expect(config.brokerUrl).toBe('test://broker:123');
    expect(config.cacheUrl).toBe('test://cache:456');
  });

  it('should pick up updated environment variables', () => {
    // Set initial values
    process.env.BROKER_URL = 'initial://broker:123';
    process.env.CACHE_URL = 'initial://cache:456';

    let config = ConsumerConfiguration.fromEnv();
    expect(config.brokerUrl).toBe('initial://broker:123');

    // Update values
    process.env.BROKER_URL = 'updated://broker:789';
    process.env.CACHE_URL = 'updated://cache:012';

    config = ConsumerConfiguration.fromEnv();
    expect(config.brokerUrl).toBe('updated://broker:789');
    expect(config.cacheUrl).toBe('updated://cache:012');
  });
});
