import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CacheSyncConsumerService } from './cache-sync-consumer.service';
import { ConfigurationLoaderService } from './configuration-loader.service';
import { HotReloadConfigurationService } from './hot-reload-configuration.service';
import { EntityChangePublisher } from '../domain/entity-change-publisher';
import { CacheAdapter } from '../domain/cache-adapter';
import { CacheSyncMonitor } from '../domain/cache-sync-monitor';

describe('CacheSyncConsumerService (monitor only)', () => {
  let service: CacheSyncConsumerService;
  let configLoader: ConfigurationLoaderService;
  let hotReloadConfig: HotReloadConfigurationService;
  let entityChangePublisher: EntityChangePublisher;
  let cacheAdapter: CacheAdapter;
  let monitor: CacheSyncMonitor;

  const originalEnv = process.env;

  beforeEach(() => {
    // Minimal setup - just what we need to construct the service
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

  it('should call monitor method when processing a simple event', async () => {
    // Arrange
    process.env.BROKER_URL = 'test://broker:123';
    process.env.CACHE_URL = 'test://cache:456';

    const testEvent = {
      id: 'test-event',
      entityType: 'Test',
      entityId: 'test-123',
      action: 'CREATE',
      payload: { test: 'data' },
      timestamp: new Date().toISOString(),
    };

    // Act
    await service.handleEvent(testEvent);

    // Assert
    expect(monitor.recordProcessedSuccess).toHaveBeenCalled();
    expect(monitor.recordProcessedSuccess).toHaveBeenCalledWith('Test', 'CREATE');
  });
});
