import { BadRequestException, Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
// The generated client no longer exposes a namespace type alias for this model;
// keep the controller untyped on the returned row instead.
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from './roles.guard';

const siteSettingsSchema = z.object({
  resumeUrl: z.string().trim().url().nullable().optional(),
});

/**
 * Public read of the singleton site settings document. Keeping this in the
 * `content` module matches the existing ownership boundary for public-facing
 * content; updates remain admin-only.
 */
@Controller('site/settings')
export class SiteSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(): Promise<{ resumeUrl: string | null }> {
    const settings = this.prisma as unknown as {
      siteSettings: { findUnique: (args: unknown) => Promise<{ resumeUrl: string | null } | null> };
    };
    const record = await settings.siteSettings.findUnique({
      where: { id: 'singleton' },
    });
    return { resumeUrl: record?.resumeUrl ?? null };
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async update(@Body() body: unknown): Promise<{ resumeUrl: string | null }> {
    const parsed = siteSettingsSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new BadRequestException('invalid site settings');
    }
    const next = parsed.data.resumeUrl ?? null;
    const settings = this.prisma as unknown as {
      siteSettings: {
        findUnique: (args: unknown) => Promise<{ resumeUrl: string | null } | null>;
        create: (args: unknown) => Promise<{ resumeUrl: string | null }>;
        upsert: (args: unknown) => Promise<{ resumeUrl: string | null }>;
      };
    };
    const record =
      parsed.data.resumeUrl === undefined
        ? (await settings.siteSettings.findUnique({ where: { id: 'singleton' } })) ||
          (await settings.siteSettings.create({ data: { id: 'singleton', resumeUrl: null } }))
        : await settings.siteSettings.upsert({
            where: { id: 'singleton' },
            create: { id: 'singleton', resumeUrl: next },
            update: { resumeUrl: next },
          });
    return { resumeUrl: record.resumeUrl ?? null };
  }
}
