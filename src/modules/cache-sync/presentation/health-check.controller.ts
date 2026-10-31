import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { CacheSyncMonitor } from '../domain/cache-sync-monitor';

/**
 * Health check endpoint for the cache synchronization service
 * Provides basic health status and can include metrics information
 */
@Controller('health')
export class HealthCheckController {
  constructor(private readonly monitor: CacheSyncMonitor) {}

  /**
   * Basic health check endpoint
   * @returns Simple status indicating service is healthy
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  check(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Detailed health check endpoint that includes metrics information
   * In a real implementation, this might return actual metric values
   * @returns Health status with metrics information
   */
  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  detailedCheck(): {
    status: string;
    timestamp: string;
    metrics: {
      uptimeSeconds: number;
      memoryUsage: { rss: number; heapUsed: number; external: number };
    };
  } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: {
        uptimeSeconds: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    };
  }
}
