import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { DryRunContentImporter } from '../application/use-cases';

export const contentImportBodySchema = z
  .object({
    dump: z.unknown(),
    dryRun: z.boolean().default(true),
  })
  .strict();

@Controller('content')
export class ContentImportController {
  constructor(private readonly importer: DryRunContentImporter) {}

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async importContent(@Body() body: unknown): Promise<unknown> {
    const parsed = contentImportBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        tag: 'content.import.validation',
        message: parsed.error.message,
      });
    }
    return this.importer.execute({
      dump: parsed.data.dump,
      dryRun: parsed.data.dryRun,
    });
  }
}
