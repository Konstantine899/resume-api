import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HotReloadConfigurationService } from './hot-reload-configuration.service';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { ConsumerConfiguration } from '../domain/consumer-configuration';

describe('HotReloadConfigurationService', () => {
  let service: HotReloadConfigurationService;
  let configLoader: ConfigurationLoaderService;
  let reloadCallback: ReturnType<typeof vi.fn<(config: ConsumerConfiguration) => void>>;

  const originalEnv = process.env;

  beforeEach(() => {
    configLoader = new ConfigurationLoaderService();
    reloadCallback = vi.fn<(config: ConsumerConfiguration) => void>();
    service = new HotReloadConfigurationService(
      configLoader,
      100, // Short interval for testing
      reloadCallback,
    );

    // Use fake timers for predictable testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
    // Ensure cleanup
    try {
      service['onModuleDestroy']();
    } catch {
      // Ignore errors during cleanup
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load initial configuration on module init', async () => {
    process.env.BROKER_URL = 'init://broker:123';
    process.env.CACHE_URL = 'init://cache:456';

    await service['onModuleInit']();

    // Fast forward timer to trigger initial load check
    vi.advanceTimersByTime(150);

    expect(service.getCurrentConfiguration()).not.toBeNull();
    expect(service.getCurrentConfiguration()?.brokerUrl).toBe('init://broker:123');
    expect(service.getCurrentConfiguration()?.cacheUrl).toBe('init://cache:456');
    expect(reloadCallback).toHaveBeenCalledTimes(1);
  });

  it('should reload configuration when changes are detected', async () => {
    // Set initial environment
    process.env.BROKER_URL = 'initial://broker:123';
    process.env.CACHE_URL = 'initial://cache:456';

    await service['onModuleInit']();

    // Clear callback mock history to isolate the reload test
    reloadCallback.mockClear();

    // Change environment variables
    process.env.BROKER_URL = 'updated://broker:789';
    process.env.CACHE_URL = 'updated://cache:012';

    console.log('Env vars after change:', {
      BROKER_URL: process.env.BROKER_URL,
      CACHE_URL: process.env.CACHE_URL,
    });

    // Fast forward timer to trigger reload check
    vi.advanceTimersByTime(150);

    // Flush pending promises
    await vi.runAllTicks();

    console.log('Current config:', service.getCurrentConfiguration());
    expect(service.getCurrentConfiguration()?.brokerUrl).toBe('updated://broker:789');
    expect(service.getCurrentConfiguration()?.cacheUrl).toBe('updated://cache:012');
    expect(reloadCallback).toHaveBeenCalledTimes(1);
  });

  it('should not reload when configuration has not changed', async () => {
    // Set initial environment
    process.env.BROKER_URL = 'static://broker:123';
    process.env.CACHE_URL = 'static://cache:456';

    await service['onModuleInit']();

    // Clear callback mock history
    reloadCallback.mockClear();

    // Don't change environment variables
    // Fast forward timer to trigger reload check
    vi.advanceTimersByTime(150);

    expect(service.getCurrentConfiguration()?.brokerUrl).toBe('static://broker:123');
    expect(service.getCurrentConfiguration()?.cacheUrl).toBe('static://cache:456');
    expect(reloadCallback).not.toHaveBeenCalled();
  });

  it('should force reload when forceReload is called', async () => {
    // Set initial environment
    process.env.BROKER_URL = 'force://initial:123';
    process.env.CACHE_URL = 'force://initial:456';

    await service['onModuleInit']();

    // Clear callback mock history
    reloadCallback.mockClear();

    // Change environment variables
    process.env.BROKER_URL = 'force://updated:789';
    process.env.CACHE_URL = 'force://updated:012';

    // Force reload without waiting for interval
    await service.forceReload();

    expect(service.getCurrentConfiguration()?.brokerUrl).toBe('force://updated:789');
    expect(service.getCurrentConfiguration()?.cacheUrl).toBe('force://updated:012');
    expect(reloadCallback).toHaveBeenCalledTimes(1);
  });

  it('should clean up interval on destroy', () => {
    service['onModuleInit']();

    // Manually set up an interval to test cleanup
    const intervalId = setInterval(() => {}, 1000);
    service.intervalId = intervalId;

    expect(service.intervalId).not.toBeNull();

    service['onModuleDestroy']();

    expect(service.intervalId).toBeNull();
  });
});
