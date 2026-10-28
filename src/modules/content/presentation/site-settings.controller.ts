import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { GetSiteSettingsUseCase, UpdateSiteSettingsUseCase } from '../application/use-cases';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

function parseOrThrow<T>(
  schema: {
    safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { message: string } };
  },
  body: unknown,
): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new BadRequestException({
      tag: 'site-settings.validation',
      message: r.error?.message ?? 'invalid body',
    });
  }
  return r.data as T;
}

const GUARDS = [JwtAuthGuard, RolesGuard];

export const siteSettingsPatchSchema = z
  .object({
    resumeUrl: z.string().url().nullable().optional(),
  })
  .strict();

@Controller('site')
export class SiteSettingsController {
  constructor(
    private readonly getSiteSettings: GetSiteSettingsUseCase,
    private readonly updateSiteSettings: UpdateSiteSettingsUseCase,
  ) {}

  @Get('settings')
  async get() {
    return this.getSiteSettings.execute();
  }

  @Patch('settings')
  @UseGuards(...GUARDS)
  async patch(@Body() body: unknown) {
    const cmd = parseOrThrow<{ resumeUrl?: string | null }>(siteSettingsPatchSchema, body);
    return this.updateSiteSettings.execute(cmd);
  }
}
