import { Controller, Get, Inject } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { HealthService, type LivenessReport, type ReadinessReport } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  // Explicit token: see the note in HealthService — the test transformer does
  // not emit `design:paramtypes`, so constructor-inferred DI would not resolve.
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe: the process is up' })
  @ApiOkResponse({ description: 'Always 200 while the process runs' })
  liveness(): LivenessReport {
    return this.healthService.liveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe: dependencies are reachable' })
  @ApiOkResponse({ description: 'Database answered a `SELECT 1` ping' })
  @ApiServiceUnavailableResponse({ description: 'Database is unreachable' })
  readiness(): Promise<ReadinessReport> {
    return this.healthService.readiness();
  }
}
