import { BadRequestException, Body, Controller, Get, Put, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { siteSettingsUpsertSchema } from './content.schemas';
import { GetSiteSettingsUseCase, UpsertSiteSettingsUseCase } from '../application/use-cases';
import type { SiteSettingsUpsertCommand } from '../application/commands';

const GUARDS = [JwtAuthGuard, RolesGuard];

/**
 * Public read of the singleton site settings document. Keeping this in the
 * `content` module matches the existing ownership boundary for public-facing
 * content; updates remain admin-only.
 */
@Controller('site/settings')
export class SiteSettingsController {
  constructor(
    private readonly getSiteSettings: GetSiteSettingsUseCase,
    private readonly upsertSiteSettings: UpsertSiteSettingsUseCase,
  ) {}

  @Get()
  async get(): Promise<{ resumeUrl: string | null }> {
    const result = await this.getSiteSettings.execute();
    return { resumeUrl: result?.resumeUrl ?? null };
  }

  @Put()
  @UseGuards(...GUARDS)
  async update(@Body() body: unknown): Promise<{ resumeUrl: string | null }> {
    const parsed = siteSettingsUpsertSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException({
        tag: 'site-settings.validation',
        message: parsed.error?.message ?? 'invalid body',
      });
    }
    const cmd: SiteSettingsUpsertCommand = parsed.data;
    const result = await this.upsertSiteSettings.execute(cmd);
    return { resumeUrl: result.resumeUrl ?? null };
  }
}
