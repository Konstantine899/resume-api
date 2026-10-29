import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { HealthCheckController } from './health-check.controller';
import { PrometheusMonitor } from '../infrastructure/prometheus-monitor';
import { CacheSyncMonitor } from '../domain/cache-sync-monitor';

describe('HealthCheckController', () => {
  let controller: HealthCheckController;
  let monitor: CacheSyncMonitor;
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a mock monitor
    monitor = {
      recordProcessedSuccess: vi.fn(),
      recordProcessedFailure: vi.fn(),
      recordProcessingLatency: vi.fn(),
      recordDeadLetterQueue: vi.fn(),
      recordEventLag: vi.fn(),
      recordRetryCount: vi.fn(),
    };

    controller = new HealthCheckController(monitor as unknown as PrometheusMonitor);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return healthy status for basic health check', () => {
    const result = controller.check();

    expect(result).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
    });

    // Verify timestamp is a valid ISO string
    expect(Date.parse(result.timestamp)).not.toBeNaN();
  });

  it('should return detailed health information', () => {
    const result = controller.detailedCheck();

    expect(result).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      metrics: {
        uptimeSeconds: expect.any(Number),
        memoryUsage: {
          rss: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number),
        },
      },
    });

    // Verify timestamp is a valid ISO string
    expect(Date.parse(result.timestamp)).not.toBeNaN();

    // Verify uptime is positive
    expect(result.metrics.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
