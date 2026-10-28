import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { SiteSettingsRepository } from '../domain/ports';

const SITE_SETTINGS_ID = 'singleton';

@Injectable()
export class PrismaSiteSettingsRepository implements SiteSettingsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get() {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SITE_SETTINGS_ID } });
    if (!row) {
      return null;
    }
    return { id: row.id, resumeUrl: row.resumeUrl, updatedAt: row.updatedAt };
  }

  async save(resumeUrl: string | null) {
    const row = await this.prisma.siteSettings.upsert({
      where: { id: SITE_SETTINGS_ID },
      create: { id: SITE_SETTINGS_ID, resumeUrl },
      update: { resumeUrl },
    });
    return { id: row.id, resumeUrl: row.resumeUrl, updatedAt: row.updatedAt };
  }
}
