import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';

// Mock interface similar to CacheSyncMonitor
interface TestMonitor {
  recordProcessedSuccess: Mock<(entityType: string, action: string) => void>;
  recordProcessedFailure: Mock<(entityType: string, action: string, errorMessage: string) => void>;
}

// Simple service that uses a monitor
class TestService {
  constructor(private monitor: TestMonitor) {}

  doWork(entityType: string, action: string): void {
    // Simulate some work
    console.log(`Doing work: ${entityType} ${action}`);

    // Call the monitor
    this.monitor.recordProcessedSuccess(entityType, action);
  }
}

describe('Monitor service test', () => {
  let service: TestService;
  let monitor: TestMonitor;

  beforeEach(() => {
    monitor = {
      recordProcessedSuccess: vi.fn<(entityType: string, action: string) => void>(),
      recordProcessedFailure:
        vi.fn<(entityType: string, action: string, errorMessage: string) => void>(),
    } as unknown as TestMonitor;

    service = new TestService(monitor);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call monitor method when doing work', () => {
    // Act
    service.doWork('TestEntity', 'CREATE');

    // Assert
    console.log('Monitor object:', monitor);
    console.log('RecordProcessedSuccess mock:', monitor.recordProcessedSuccess);
    console.log('Calls:', monitor.recordProcessedSuccess.mock.calls);

    expect(monitor.recordProcessedSuccess).toHaveBeenCalled();
    expect(monitor.recordProcessedSuccess).toHaveBeenCalledWith('TestEntity', 'CREATE');
  });
});
