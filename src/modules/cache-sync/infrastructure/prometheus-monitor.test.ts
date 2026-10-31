import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PrometheusMonitor } from './prometheus-monitor';

describe('PrometheusMonitor', () => {
  let monitor: PrometheusMonitor;

  beforeEach(() => {
    monitor = new PrometheusMonitor();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(monitor).toBeDefined();
  });

  it('should implement CacheSyncMonitor interface', () => {
    expect(typeof monitor.recordProcessedSuccess).toBe('function');
    expect(typeof monitor.recordProcessedFailure).toBe('function');
    expect(typeof monitor.recordProcessingLatency).toBe('function');
    expect(typeof monitor.recordDeadLetterQueue).toBe('function');
    expect(typeof monitor.recordEventLag).toBe('function');
    expect(typeof monitor.recordRetryCount).toBe('function');
  });

  it('should log when recording a processed success', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    monitor.recordProcessedSuccess('User', 'CREATE');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Prometheus METRIC: cache_sync_processed_success_total{entity_type="User",action="CREATE"} ++',
    );

    consoleSpy.mockRestore();
  });

  it('should log when recording a processed failure', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    monitor.recordProcessedFailure('Project', 'UPDATE', 'Validation failed');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Prometheus METRIC: cache_sync_processed_failure_total{entity_type="Project",action="UPDATE"} ++',
    );

    consoleSpy.mockRestore();
  });

  it('should log when recording processing latency', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    monitor.recordProcessingLatency('Media', 'DELETE', 1500); // 1.5 seconds

    expect(consoleSpy).toHaveBeenCalledWith(
      'Prometheus METRIC: cache_sync_processing_latency_seconds_sum{entity_type="Media",action="DELETE"} +=1.5',
    );

    consoleSpy.mockRestore();
  });

  it('should log when recording a dead letter queue event', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    monitor.recordDeadLetterQueue('User', 'CREATE');

    expect(consoleSpy).toHaveBeenCalledWith(
      'Prometheus METRIC: cache_sync_deadletterqueue_total{entity_type="User",action="CREATE"} ++',
    );

    consoleSpy.mockRestore();
  });

  it('should log when recording event lag', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    monitor.recordEventLag(3000); // 3 seconds

    expect(consoleSpy).toHaveBeenCalledWith('Prometheus METRIC: cache_sync_event_lag_seconds 3');

    consoleSpy.mockRestore();
  });

  it('should log when recording retry count', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    monitor.recordRetryCount('Post', 4);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Prometheus METRIC: cache_sync_retry_count_bucket{entity_type="Post",le="4"} ++',
    );

    consoleSpy.mockRestore();
  });
});
