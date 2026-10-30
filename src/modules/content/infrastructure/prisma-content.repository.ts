/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { LocalizedText } from '../domain/localized-text';
import {
  AboutContent,
  ContactContent,
  Job,
  Project,
  SkillCategory,
  Technology,
  SiteSettings,
} from '../domain/aggregates';
import type {
  AboutRepository,
  ContactRepository,
  JobRepository,
  ProjectRepository,
  SkillCategoryRepository,
  TechnologyRepository,
  SiteSettingsRepository,
} from '../domain/ports';

function asJson(value: unknown): any {
  return value as any;
}

function asLocalizedJson(value: unknown): any {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toJSON?: unknown }).toJSON === 'function'
  ) {
    return (value as { toJSON: () => unknown }).toJSON();
  }
  return value;
}

function asLocalizedRecord(value: unknown): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = asLocalizedJson(v);
  }
  return out;
}

function toRecordLocalized(value: unknown): Record<string, LocalizedText> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, LocalizedText> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    try {
      out[k] = LocalizedText.fromJSON(v);
    } catch {
      // skip malformed entries
    }
  }
  return out;
}

@Injectable()
export class PrismaAboutRepository implements AboutRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(): Promise<AboutContent | null> {
    const row = await this.prisma.aboutContent.findUnique({ where: { id: 'singleton' } });
    if (!row) return null;
    return AboutContent.reconstitute({
      id: row.id,
      fullName: row.fullName,
      descriptions: Array.isArray(row.descriptions)
        ? (row.descriptions as unknown[]).map((v) => LocalizedText.fromJSON(v))
        : [],
      stats: toRecordLocalized(row.stats),
      statLabels: row.statLabels ? toRecordLocalized(row.statLabels) : undefined,
      ctaLabel: row.ctaLabel ? LocalizedText.fromJSON(row.ctaLabel) : null,
      portrait: row.portrait ?? undefined,
      updatedAt: row.updatedAt,
    });
  }

  async save(entity: AboutContent): Promise<void> {
    const p = entity.toProps();
    await this.prisma.aboutContent.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        fullName: p.fullName,
        descriptions: asJson(p.descriptions.map((v) => asLocalizedJson(v))),
        stats: asJson(asLocalizedRecord(p.stats)),
        statLabels: asJson(p.statLabels ? asLocalizedRecord(p.statLabels) : null),

        ctaLabel: asJson(p.ctaLabel ? asLocalizedJson(p.ctaLabel) : null),
        portrait: p.portrait ?? null,
        updatedAt: p.updatedAt,
      },
      update: {
        fullName: p.fullName,
        descriptions: asJson(p.descriptions.map((v) => asLocalizedJson(v))),
        stats: asJson(asLocalizedRecord(p.stats)),
        statLabels: asJson(p.statLabels ? asLocalizedRecord(p.statLabels) : null),

        ctaLabel: asJson(p.ctaLabel ? asLocalizedJson(p.ctaLabel) : null),
        portrait: p.portrait ?? null,
        updatedAt: p.updatedAt,
      },
    });
  }
}

@Injectable()
export class PrismaContactRepository implements ContactRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(): Promise<ContactContent | null> {
    const row = await this.prisma.contactContent.findUnique({ where: { id: 'singleton' } });
    if (!row) return null;
    return ContactContent.reconstitute({
      id: row.id,
      email: row.email,
      texts: toRecordLocalized(row.texts),
      formTexts: toRecordLocalized(row.formTexts),
      socialLinks: (row.socialLinks &&
      typeof row.socialLinks === 'object' &&
      !Array.isArray(row.socialLinks)
        ? (row.socialLinks as Record<string, { name: string; href: string }>)
        : {}) as Record<string, { name: string; href: string }>,
      updatedAt: row.updatedAt,
    });
  }

  async save(entity: ContactContent): Promise<void> {
    const p = entity.toProps();
    await this.prisma.contactContent.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        email: p.email,
        texts: asJson(asLocalizedRecord(p.texts)),
        formTexts: asJson(asLocalizedRecord(p.formTexts)),
        socialLinks: asJson(p.socialLinks),
        updatedAt: p.updatedAt,
      },
      update: {
        email: p.email,
        texts: asJson(asLocalizedRecord(p.texts)),
        formTexts: asJson(asLocalizedRecord(p.formTexts)),
        socialLinks: asJson(p.socialLinks),
        updatedAt: p.updatedAt,
      },
    });
  }
}

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toDomain(row: any): Project {
    return Project.reconstitute({
      id: row.id,
      title: row.title,
      description: row.description as { en: string; ru: string },
      techIcons: (row.techIcons as string[]) ?? [],
      link: row.link ?? null,
      image: row.image ?? '',
      category: row.category ?? undefined,
      status: row.status ?? undefined,
      featured: row.featured,
      role: (row.role as { en: string; ru: string } | null) ?? undefined,
      metrics: (row.metrics as string[] | null) ?? undefined,
      year: row.year ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: string): Promise<Project | null> {
    const row = await this.prisma.project.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }
  async list(): Promise<Project[]> {
    const rows = await this.prisma.project.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.toDomain(r));
  }
  async save(entity: Project): Promise<void> {
    const p = entity.toProps();
    await this.prisma.project.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        title: p.title,
        description: asJson(p.description),
        techIcons: asJson(p.techIcons),
        link: p.link,
        image: p.image,
        category: p.category ?? null,
        status: p.status ?? null,
        featured: p.featured,
        role: asJson(p.role ?? null),
        metrics: asJson(p.metrics ?? null),
        year: p.year ?? null,
        createdAt: p.createdAt ?? new Date(),
        updatedAt: p.updatedAt,
      },
      update: {
        title: p.title,
        description: asJson(p.description),
        techIcons: asJson(p.techIcons),
        link: p.link,
        image: p.image,
        category: p.category ?? null,
        status: p.status ?? null,
        featured: p.featured,
        role: asJson(p.role ?? null),
        metrics: asJson(p.metrics ?? null),
        year: p.year ?? null,
        updatedAt: p.updatedAt,
      },
    });
  }
  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaSkillCategoryRepository implements SkillCategoryRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toDomain(row: any): SkillCategory {
    return SkillCategory.reconstitute({
      id: row.id,
      category: row.category,
      categoryName: row.categoryName,
      technologies: (row.technologies as any[]) ?? [],
      updatedAt: row.updatedAt,
    });
  }

  async findByCategory(category: string): Promise<SkillCategory | null> {
    const row = await this.prisma.skillCategory.findUnique({ where: { category } });
    return row ? this.toDomain(row) : null;
  }
  async list(): Promise<SkillCategory[]> {
    const rows = await this.prisma.skillCategory.findMany({ orderBy: { categoryName: 'asc' } });
    return rows.map((r) => this.toDomain(r));
  }
  async save(entity: SkillCategory): Promise<void> {
    const p = entity.toProps();
    await this.prisma.skillCategory.upsert({
      where: { category: p.category },
      create: {
        id: p.id,
        category: p.category,
        categoryName: p.categoryName,
        technologies: asJson(p.technologies),
        updatedAt: p.updatedAt,
      },
      update: {
        id: p.id,
        categoryName: p.categoryName,
        technologies: asJson(p.technologies),
        updatedAt: p.updatedAt,
      },
    });
  }
  async delete(category: string): Promise<void> {
    await this.prisma.skillCategory.delete({ where: { category } });
  }
}

@Injectable()
export class PrismaJobRepository implements JobRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toDomain(row: any): Job {
    return Job.reconstitute({
      id: row.id,
      company: row.company,
      position: row.position as { en: string; ru: string },
      period: row.period,
      startDate: row.startDate,
      endDate: row.endDate ?? null,
      description: row.description as { en: string[]; ru: string[] },
      technologies: (row.technologies as string[]) ?? [],
      location: row.location,
      current: row.current,
      employmentType: row.employmentType,
      level: row.level,
      companyUrl: row.companyUrl ?? undefined,
      featured: row.featured,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async findById(id: string): Promise<Job | null> {
    const row = await this.prisma.job.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }
  async list(): Promise<Job[]> {
    const rows = await this.prisma.job.findMany({ orderBy: { startDate: 'desc' } });
    return rows.map((r) => this.toDomain(r));
  }
  async save(entity: Job): Promise<void> {
    const p = entity.toProps();
    await this.prisma.job.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        company: p.company,
        position: asJson(p.position),
        period: p.period,
        startDate: p.startDate,
        endDate: p.endDate,
        description: asJson(p.description),
        technologies: asJson(p.technologies),
        location: p.location,
        current: p.current,
        employmentType: p.employmentType,
        level: p.level,
        companyUrl: p.companyUrl ?? null,
        featured: p.featured,
        createdAt: p.createdAt ?? new Date(),
        updatedAt: p.updatedAt,
      },
      update: {
        company: p.company,
        position: asJson(p.position),
        period: p.period,
        startDate: p.startDate,
        endDate: p.endDate,
        description: asJson(p.description),
        technologies: asJson(p.technologies),
        location: p.location,
        current: p.current,
        employmentType: p.employmentType,
        level: p.level,
        companyUrl: p.companyUrl ?? null,
        featured: p.featured,
        updatedAt: p.updatedAt,
      },
    });
  }
  async delete(id: string): Promise<void> {
    await this.prisma.job.delete({ where: { id } });
  }
}

@Injectable()
export class PrismaTechnologyRepository implements TechnologyRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private toDomain(row: any): Technology {
    return Technology.reconstitute({
      key: row.key,
      url: row.url,
      invertInDark: row.invertInDark ?? undefined,
      updatedAt: row.updatedAt,
    });
  }

  async findByKey(key: string): Promise<Technology | null> {
    const row = await this.prisma.technology.findUnique({ where: { key } });
    return row ? this.toDomain(row) : null;
  }
  async list(): Promise<Technology[]> {
    const rows = await this.prisma.technology.findMany({ orderBy: { key: 'asc' } });
    return rows.map((r) => this.toDomain(r));
  }
  async save(entity: Technology): Promise<void> {
    const p = entity.toProps();
    await this.prisma.technology.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        url: p.url,
        invertInDark: p.invertInDark ?? null,
        updatedAt: p.updatedAt,
      },
      update: {
        url: p.url,
        invertInDark: p.invertInDark ?? null,
        updatedAt: p.updatedAt,
      },
    });
  }
  async delete(key: string): Promise<void> {
    await this.prisma.technology.delete({ where: { key } });
  }
}

@Injectable()
export class PrismaSiteSettingsRepository implements SiteSettingsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(): Promise<SiteSettings | null> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: 'singleton' } });
    if (!row) return null;
    return SiteSettings.reconstitute({
      id: row.id,
      resumeUrl: row.resumeUrl ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  async save(entity: SiteSettings): Promise<void> {
    const p = entity.toProps();
    await this.prisma.siteSettings.upsert({
      where: { id: p.id },
      create: {
        id: p.id,
        resumeUrl: p.resumeUrl ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
      update: {
        resumeUrl: p.resumeUrl ?? null,
        updatedAt: p.updatedAt,
      },
    });
  }
}
