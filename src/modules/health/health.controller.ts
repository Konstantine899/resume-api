import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthService, type LiveResult, type ReadyResult } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (process is up)' })
  getLive(): LiveResult {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe — 200 when the database is reachable, 503 otherwise',
  })
  getReady(): Promise<ReadyResult> {
    return this.healthService.ready();
  }
}
