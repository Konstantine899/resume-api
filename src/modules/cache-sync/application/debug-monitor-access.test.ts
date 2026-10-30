import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CacheSyncConsumerService } from './cache-sync-consumer.service';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { HotReloadConfigurationService } from './hot-reload-configuration.service';
import { EntityChangePublisher } from '../domain/entity-change-publisher';
import { CacheAdapter } from '../domain/cache-adapter';
import { CacheSyncMonitor } from '../domain/cache-sync-monitor';

describe('Debug monitor access', () => {
  let service: CacheSyncConsumerService;
  let configLoader: ConfigurationLoaderService;
  let hotReloadConfig: HotReloadConfigurationService;
  let entityChangePublisher: EntityChangePublisher;
  let cacheAdapter: CacheAdapter;
  let monitor: CacheSyncMonitor;

  const originalEnv = process.env;

  beforeEach(() => {
    // Initialize dependencies
    configLoader = new ConfigurationLoaderService();
    hotReloadConfig = new HotReloadConfigurationService(configLoader);
    entityChangePublisher = {
      publishEntityChange: vi.fn().mockResolvedValue(undefined),
    } as unknown as EntityChangePublisher;
    cacheAdapter = {
      update: vi.fn().mockResolvedValue(undefined),
      invalidate: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    } as unknown as CacheAdapter;
    monitor = {
      recordProcessedSuccess: vi.fn(),
      recordProcessedFailure: vi.fn(),
      recordProcessingLatency: vi.fn(),
      recordDeadLetterQueue: vi.fn(),
      recordEventLag: vi.fn(),
      recordRetryCount: vi.fn(),
    } as unknown as CacheSyncMonitor;

    service = new CacheSyncConsumerService(
      configLoader,
      hotReloadConfig,
      entityChangePublisher,
      cacheAdapter,
      monitor,
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should verify that service monitor is the same object as test monitor', () => {
    // Arrange
    // Act
    // Access the service's monitor property directly (bypassing privacy for testing)
    const serviceMonitor = (service as unknown as { monitor: CacheSyncMonitor }).monitor;

    // Assert that they're the same object
    expect(serviceMonitor).toBe(monitor);

    // Now use the service's monitor to track calls
    serviceMonitor.recordProcessedSuccess('Test', 'CREATE');

    // Verify using the test's monitor variable
    expect(monitor.recordProcessedSuccess).toHaveBeenCalled();
    expect(monitor.recordProcessedSuccess).toHaveBeenCalledWith('Test', 'CREATE');

    // Verify using the service's monitor variable
    expect(serviceMonitor.recordProcessedSuccess).toHaveBeenCalled();
    expect(serviceMonitor.recordProcessedSuccess).toHaveBeenCalledWith('Test', 'CREATE');
  });
});
