import { describe, expect, it, vi } from 'vitest';
import { CacheSyncMonitor } from './cache-sync-monitor';

describe('CacheSyncMonitor', () => {
  it('should define the required methods', () => {
    // Create a mock implementation to test the interface shape
    class MockMonitor implements CacheSyncMonitor {
      recordProcessedSuccess = vi.fn();
      recordProcessedFailure = vi.fn();
      recordProcessingLatency = vi.fn();
      recordDeadLetterQueue = vi.fn();
      recordEventLag = vi.fn();
      recordRetryCount = vi.fn();
    }

    const monitor = new MockMonitor();
    expect(typeof monitor.recordProcessedSuccess).toBe('function');
    expect(typeof monitor.recordProcessedFailure).toBe('function');
    expect(typeof monitor.recordProcessingLatency).toBe('function');
    expect(typeof monitor.recordDeadLetterQueue).toBe('function');
    expect(typeof monitor.recordEventLag).toBe('function');
    expect(typeof monitor.recordRetryCount).toBe('function');
  });

  it('should allow instantiation of classes that implement the interface', () => {
    class TestMonitor implements CacheSyncMonitor {
      recordProcessedSuccess() {
        return;
      }
      recordProcessedFailure() {
        return;
      }
      recordProcessingLatency() {
        return;
      }
      recordDeadLetterQueue() {
        return;
      }
      recordEventLag() {
        return;
      }
      recordRetryCount() {
        return;
      }
    }

    expect(() => new TestMonitor()).not.toThrow();
  });

  it('should accept correct parameter types', () => {
    const processSuccessMock = vi.fn();
    const processFailureMock = vi.fn();
    const processingLatencyMock = vi.fn();
    const deadLetterQueueMock = vi.fn();
    const eventLagMock = vi.fn();
    const retryCountMock = vi.fn();

    class TestMonitor implements CacheSyncMonitor {
      recordProcessedSuccess = processSuccessMock;
      recordProcessedFailure = processFailureMock;
      recordProcessingLatency = processingLatencyMock;
      recordDeadLetterQueue = deadLetterQueueMock;
      recordEventLag = eventLagMock;
      recordRetryCount = retryCountMock;
    }

    const monitor = new TestMonitor();

    // Test all methods with appropriate parameters
    monitor.recordProcessedSuccess('User', 'CREATE');
    monitor.recordProcessedFailure('Project', 'UPDATE', 'Validation failed');
    monitor.recordProcessingLatency('Media', 'DELETE', 150);
    monitor.recordDeadLetterQueue('User', 'CREATE');
    monitor.recordEventLag(2500);
    monitor.recordRetryCount('Post', 3);

    // Verify all methods were called with correct parameters
    expect(processSuccessMock).toHaveBeenCalledWith('User', 'CREATE');
    expect(processFailureMock).toHaveBeenCalledWith('Project', 'UPDATE', 'Validation failed');
    expect(processingLatencyMock).toHaveBeenCalledWith('Media', 'DELETE', 150);
    expect(deadLetterQueueMock).toHaveBeenCalledWith('User', 'CREATE');
    expect(eventLagMock).toHaveBeenCalledWith(2500);
    expect(retryCountMock).toHaveBeenCalledWith('Post', 3);
  });
});
