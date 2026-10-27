/* eslint-disable @typescript-eslint/no-explicit-any */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { legacyImportSchema, type LegacyImportPayload } from './import-schemas';

import {
  AboutContent,
  ContactContent,
  Job,
  Project,
  SkillCategory,
  Technology,
} from '../domain/aggregates';
import type {
  AboutRepository,
  ContactRepository,
  JobRepository,
  ProjectRepository,
  SiteSettingsRepository,
  SkillCategoryRepository,
  TechnologyRepository,
} from '../domain/ports';
import { ContentNotFoundError } from './errors';
import type {
  AboutUpsertCommand,
  ContactUpsertCommand,
  JobCreateCommand,
  JobUpdateCommand,
  ProjectCreateCommand,
  ProjectUpdateCommand,
  SkillCategoryUpsertCommand,
  TechnologyUpsertCommand,
} from './commands';
import {
  ABOUT_REPOSITORY,
  CONTACT_REPOSITORY,
  JOB_REPOSITORY,
  PROJECT_REPOSITORY,
  SITE_SETTINGS_REPOSITORY,
  SKILL_CATEGORY_REPOSITORY,
  TECHNOLOGY_REPOSITORY,
} from '../content.tokens';

@Injectable()
export class GetAboutUseCase {
  constructor(@Inject(ABOUT_REPOSITORY) private readonly repo: AboutRepository) {}
  async execute(): Promise<AboutContent | null> {
    return this.repo.get();
  }
}

@Injectable()
export class UpsertAboutUseCase {
  constructor(@Inject(ABOUT_REPOSITORY) private readonly repo: AboutRepository) {}
  async execute(cmd: AboutUpsertCommand): Promise<AboutContent> {
    const existing = await this.repo.get();
    if (!existing) {
      const created = AboutContent.create(cmd as never);
      await this.repo.save(created);
      return created;
    }
    existing.update(cmd);
    await this.repo.save(existing);
    return existing;
  }
}

@Injectable()
export class GetContactUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private readonly repo: ContactRepository) {}
  async execute(): Promise<ContactContent | null> {
    return this.repo.get();
  }
}

@Injectable()
export class UpsertContactUseCase {
  constructor(@Inject(CONTACT_REPOSITORY) private readonly repo: ContactRepository) {}
  async execute(cmd: ContactUpsertCommand): Promise<ContactContent> {
    const existing = await this.repo.get();
    if (!existing) {
      const created = ContactContent.create(cmd as never);
      await this.repo.save(created);
      return created;
    }
    existing.update(cmd);
    await this.repo.save(existing);
    return existing;
  }
}

@Injectable()
export class ListProjectsUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repo: ProjectRepository) {}
  async execute(): Promise<Project[]> {
    return this.repo.list();
  }
}

@Injectable()
export class GetProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repo: ProjectRepository) {}
  async execute(id: string): Promise<Project> {
    const found = await this.repo.findById(id);
    if (!found) throw new ContentNotFoundError('Project not found');
    return found;
  }
}

@Injectable()
export class CreateProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repo: ProjectRepository) {}
  async execute(cmd: ProjectCreateCommand): Promise<Project> {
    const entity = Project.create(cmd);
    await this.repo.save(entity);
    return entity;
  }
}

@Injectable()
export class UpdateProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repo: ProjectRepository) {}
  async execute(cmd: ProjectUpdateCommand): Promise<Project> {
    const existing = await this.repo.findById(cmd.id);
    if (!existing) throw new ContentNotFoundError('Project not found');
    existing.update(cmd);
    await this.repo.save(existing);
    return existing;
  }
}

@Injectable()
export class DeleteProjectUseCase {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repo: ProjectRepository) {}
  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

@Injectable()
export class ListSkillCategoriesUseCase {
  constructor(@Inject(SKILL_CATEGORY_REPOSITORY) private readonly repo: SkillCategoryRepository) {}
  async execute(): Promise<SkillCategory[]> {
    return this.repo.list();
  }
}

@Injectable()
export class UpsertSkillCategoryUseCase {
  constructor(@Inject(SKILL_CATEGORY_REPOSITORY) private readonly repo: SkillCategoryRepository) {}
  async execute(cmd: SkillCategoryUpsertCommand): Promise<SkillCategory> {
    const existing = await this.repo.findByCategory(cmd.category);
    if (!existing) {
      const created = SkillCategory.create(cmd as never);
      await this.repo.save(created);
      return created;
    }
    existing.update(cmd);
    await this.repo.save(existing);
    return existing;
  }
}

@Injectable()
export class DeleteSkillCategoryUseCase {
  constructor(@Inject(SKILL_CATEGORY_REPOSITORY) private readonly repo: SkillCategoryRepository) {}
  async execute(category: string): Promise<void> {
    await this.repo.delete(category);
  }
}

@Injectable()
export class ListJobsUseCase {
  constructor(@Inject(JOB_REPOSITORY) private readonly repo: JobRepository) {}
  async execute(): Promise<Job[]> {
    return this.repo.list();
  }
}

@Injectable()
export class GetJobUseCase {
  constructor(@Inject(JOB_REPOSITORY) private readonly repo: JobRepository) {}
  async execute(id: string): Promise<Job> {
    const found = await this.repo.findById(id);
    if (!found) throw new ContentNotFoundError('Job not found');
    return found;
  }
}

@Injectable()
export class CreateJobUseCase {
  constructor(@Inject(JOB_REPOSITORY) private readonly repo: JobRepository) {}
  async execute(cmd: JobCreateCommand): Promise<Job> {
    const entity = Job.create(cmd);
    await this.repo.save(entity);
    return entity;
  }
}

@Injectable()
export class UpdateJobUseCase {
  constructor(@Inject(JOB_REPOSITORY) private readonly repo: JobRepository) {}
  async execute(cmd: JobUpdateCommand): Promise<Job> {
    const existing = await this.repo.findById(cmd.id);
    if (!existing) throw new ContentNotFoundError('Job not found');
    existing.update(cmd);
    await this.repo.save(existing);
    return existing;
  }
}

@Injectable()
export class DeleteJobUseCase {
  constructor(@Inject(JOB_REPOSITORY) private readonly repo: JobRepository) {}
  async execute(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}

@Injectable()
export class ListTechnologiesUseCase {
  constructor(@Inject(TECHNOLOGY_REPOSITORY) private readonly repo: TechnologyRepository) {}
  async execute(): Promise<Technology[]> {
    return this.repo.list();
  }
}

@Injectable()
export class UpsertTechnologyUseCase {
  constructor(@Inject(TECHNOLOGY_REPOSITORY) private readonly repo: TechnologyRepository) {}
  async execute(cmd: TechnologyUpsertCommand): Promise<Technology> {
    const existing = await this.repo.findByKey(cmd.key);
    if (!existing) {
      const created = Technology.create(cmd as never);
      await this.repo.save(created);
      return created;
    }
    // Technology has no update method; replace by recreating
    const replaced = Technology.create(cmd);
    await this.repo.save(replaced);
    return replaced;
  }
}

@Injectable()
export class DeleteTechnologyUseCase {
  constructor(@Inject(TECHNOLOGY_REPOSITORY) private readonly repo: TechnologyRepository) {}
  async execute(key: string): Promise<void> {
    await this.repo.delete(key);
  }
}

@Injectable()
export class GetSiteSettingsUseCase {
  constructor(@Inject(SITE_SETTINGS_REPOSITORY) private readonly repo: SiteSettingsRepository) {}
  async execute(): Promise<{ resumeUrl: string | null; updatedAt: Date | null }> {
    const settings = await this.repo.get();
    return { resumeUrl: settings?.resumeUrl ?? null, updatedAt: settings?.updatedAt ?? null };
  }
}

@Injectable()
export class UpdateSiteSettingsUseCase {
  constructor(@Inject(SITE_SETTINGS_REPOSITORY) private readonly repo: SiteSettingsRepository) {}
  async execute(input: {
    resumeUrl?: string | null;
  }): Promise<{ resumeUrl: string | null; updatedAt: Date | null }> {
    const resumeUrl = input.resumeUrl === undefined ? null : input.resumeUrl;
    const settings = await this.repo.save(resumeUrl);
    return { resumeUrl: settings.resumeUrl, updatedAt: settings.updatedAt };
  }
}

export interface ImportCountBreakdown {
  about: number;
  contact: number;
  projects: number;
  skillCategories: number;
  jobs: number;
  technologies: number;
  total: number;
}

export interface ImportResult {
  dryRun: boolean;
  willWrite: boolean;
  applied: boolean;
  counts: ImportCountBreakdown;
  newCounts: ImportCountBreakdown;
  updatedCounts: ImportCountBreakdown;
  createdIds: {
    projects: string[];
    skillCategories: string[];
    jobs: string[];
    technologies: string[];
  };
  updatedIds: {
    projects: string[];
    skillCategories: string[];
    jobs: string[];
    technologies: string[];
  };
  new: number;
  updated: number;
  errors: Array<{ path: string; message: string }>;
  validationErrors: Array<{ path: string; message: string }>;
  errorCount: number;
  diff: string[];
}

const ZERO_COUNTS: ImportCountBreakdown = {
  about: 0,
  contact: 0,
  projects: 0,
  skillCategories: 0,
  jobs: 0,
  technologies: 0,
  total: 0,
};

function cloneCounts(input: Partial<ImportCountBreakdown>): ImportCountBreakdown {
  const out = { ...ZERO_COUNTS, ...input };
  out.total =
    out.about + out.contact + out.projects + out.skillCategories + out.jobs + out.technologies;
  return out;
}

@Injectable()
export class DryRunContentImporter {
  constructor(
    @Inject(ABOUT_REPOSITORY) private readonly aboutRepo: AboutRepository,
    @Inject(CONTACT_REPOSITORY) private readonly contactRepo: ContactRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: ProjectRepository,
    @Inject(SKILL_CATEGORY_REPOSITORY) private readonly skillRepo: SkillCategoryRepository,
    @Inject(JOB_REPOSITORY) private readonly jobRepo: JobRepository,
    @Inject(TECHNOLOGY_REPOSITORY) private readonly technologyRepo: TechnologyRepository,
    private readonly upsertAbout: UpsertAboutUseCase,
    private readonly upsertContact: UpsertContactUseCase,
    private readonly createProject: CreateProjectUseCase,
    private readonly updateProject: UpdateProjectUseCase,
    private readonly upsertSkillCategory: UpsertSkillCategoryUseCase,
    private readonly createJob: CreateJobUseCase,
    private readonly updateJob: UpdateJobUseCase,
    private readonly upsertTechnology: UpsertTechnologyUseCase,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async execute(payload: unknown, dryRunOverride?: boolean): Promise<ImportResult> {
    const normalized = this.normalizeInput(payload, dryRunOverride);

    const parsed = legacyImportSchema.safeParse(normalized.dump);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue: any) => ({
        path: issue.path.join('.') || '(root)',
        message: issue.message,
      }));
      return this.makeResult(
        normalized.dryRun,
        false,
        ZERO_COUNTS,
        ZERO_COUNTS,
        ZERO_COUNTS,
        {
          projects: [],
          skillCategories: [],
          jobs: [],
          technologies: [],
        },
        {
          projects: [],
          skillCategories: [],
          jobs: [],
          technologies: [],
        },
        0,
        0,
        errors,
        [],
      );
    }

    const dump: LegacyImportPayload = parsed.data;

    const errors: Array<{ path: string; message: string }> = [];
    const newCounts = { ...ZERO_COUNTS };
    const updatedCounts = { ...ZERO_COUNTS };
    const processedCounts = { ...ZERO_COUNTS };
    const createdIds = {
      projects: [] as string[],
      skillCategories: [] as string[],
      jobs: [] as string[],
      technologies: [] as string[],
    };
    const updatedIds = {
      projects: [] as string[],
      skillCategories: [] as string[],
      jobs: [] as string[],
      technologies: [] as string[],
    };
    const diff: string[] = [];

    // About (singleton)
    if (dump.about) {
      processedCounts.about = 1;
      const existing = await this.aboutRepo.get();
      if (existing) {
        updatedCounts.about = 1;
        try {
          existing.update(dump.about as any);
        } catch (e) {
          errors.push({ path: 'about', message: (e as Error).message });
        }
        diff.push('AboutContent: update');
      } else {
        newCounts.about = 1;
        try {
          AboutContent.create(dump.about as any);
        } catch (e) {
          errors.push({ path: 'about', message: (e as Error).message });
        }
        diff.push('AboutContent: create');
      }
    }

    // Contact (singleton)
    if (dump.contact) {
      processedCounts.contact = 1;
      const existing = await this.contactRepo.get();
      if (existing) {
        updatedCounts.contact = 1;
        try {
          existing.update(dump.contact as any);
        } catch (e) {
          errors.push({ path: 'contact', message: (e as Error).message });
        }
        diff.push('ContactContent: update');
      } else {
        newCounts.contact = 1;
        try {
          ContactContent.create(dump.contact as any);
        } catch (e) {
          errors.push({ path: 'contact', message: (e as Error).message });
        }
        diff.push('ContactContent: create');
      }
    }

    // Projects
    for (let i = 0; i < (dump.projects ?? []).length; i++) {
      const item = dump.projects[i];
      processedCounts.projects++;
      const existing = item.id ? await this.projectRepo.findById(item.id) : null;
      if (existing) {
        updatedCounts.projects++;
        updatedIds.projects.push(existing.id);
        try {
          existing.update(item as any);
        } catch (e) {
          errors.push({ path: `projects[${i}]`, message: (e as Error).message });
        }
        diff.push(`Project: update ${existing.id}`);
      } else {
        newCounts.projects++;
        try {
          const entity = Project.create(item as any);
          createdIds.projects.push(entity.id);
          diff.push(`Project: create ${entity.id}`);
        } catch (e) {
          errors.push({ path: `projects[${i}]`, message: (e as Error).message });
        }
      }
    }

    // Skill categories
    for (let i = 0; i < (dump.skillCategories ?? []).length; i++) {
      const item = dump.skillCategories[i];
      processedCounts.skillCategories++;
      const existing = item.category ? await this.skillRepo.findByCategory(item.category) : null;
      if (existing) {
        updatedCounts.skillCategories++;
        updatedIds.skillCategories.push(existing.id);
        try {
          existing.update(item as any);
        } catch (e) {
          errors.push({ path: `skillCategories[${i}]`, message: (e as Error).message });
        }
        diff.push(`SkillCategory: update ${existing.id}`);
      } else {
        newCounts.skillCategories++;
        try {
          const entity = SkillCategory.create(item as any);
          createdIds.skillCategories.push(entity.id);
          diff.push(`SkillCategory: create ${entity.id}`);
        } catch (e) {
          errors.push({ path: `skillCategories[${i}]`, message: (e as Error).message });
        }
      }
    }

    // Jobs
    for (let i = 0; i < (dump.jobs ?? []).length; i++) {
      const item = dump.jobs[i];
      processedCounts.jobs++;
      const existing = item.id ? await this.jobRepo.findById(item.id) : null;
      if (existing) {
        updatedCounts.jobs++;
        updatedIds.jobs.push(existing.id);
        try {
          existing.update(item as any);
        } catch (e) {
          errors.push({ path: `jobs[${i}]`, message: (e as Error).message });
        }
        diff.push(`Job: update ${existing.id}`);
      } else {
        newCounts.jobs++;
        try {
          const entity = Job.create(item as any);
          createdIds.jobs.push(entity.id);
          diff.push(`Job: create ${entity.id}`);
        } catch (e) {
          errors.push({ path: `jobs[${i}]`, message: (e as Error).message });
        }
      }
    }

    // Technologies
    for (let i = 0; i < (dump.technologies ?? []).length; i++) {
      const item = dump.technologies[i];
      processedCounts.technologies++;
      const existing = item.key ? await this.technologyRepo.findByKey(item.key) : null;
      if (existing) {
        updatedCounts.technologies++;
        updatedIds.technologies.push(existing.key);
        diff.push(`Technology: update ${existing.key}`);
      } else {
        newCounts.technologies++;
        try {
          const entity = Technology.create(item as any);
          createdIds.technologies.push(entity.key);
          diff.push(`Technology: create ${entity.key}`);
        } catch (e) {
          errors.push({ path: `technologies[${i}]`, message: (e as Error).message });
        }
      }
    }

    const newTotal =
      newCounts.about +
      newCounts.contact +
      newCounts.projects +
      newCounts.skillCategories +
      newCounts.jobs +
      newCounts.technologies;
    const updatedTotal =
      updatedCounts.about +
      updatedCounts.contact +
      updatedCounts.projects +
      updatedCounts.skillCategories +
      updatedCounts.jobs +
      updatedCounts.technologies;

    if (errors.length > 0) {
      return this.makeResult(
        normalized.dryRun,
        false,
        processedCounts,
        newCounts,
        updatedCounts,
        createdIds,
        updatedIds,
        newTotal,
        updatedTotal,
        errors,
        diff,
      );
    }

    if (normalized.dryRun) {
      return this.makeResult(
        true,
        false,
        processedCounts,
        newCounts,
        updatedCounts,
        createdIds,
        updatedIds,
        newTotal,
        updatedTotal,
        [],
        diff,
      );
    }

    // Apply via repositories/use-cases, wrapped in a transaction when possible.
    try {
      const applyWork = async (): Promise<void> => {
        if (dump.about) {
          await this.upsertAbout.execute(dump.about as any);
        }
        if (dump.contact) {
          await this.upsertContact.execute(dump.contact as any);
        }
        for (const item of dump.projects ?? []) {
          const existing = item.id ? await this.projectRepo.findById(item.id) : null;
          if (existing) {
            await this.updateProject.execute({ ...(item as any), id: item.id ?? existing.id });
          } else {
            await this.createProject.execute(item as any);
          }
        }
        for (const item of dump.skillCategories ?? []) {
          await this.upsertSkillCategory.execute(item as any);
        }
        for (const item of dump.jobs ?? []) {
          const existing = item.id ? await this.jobRepo.findById(item.id) : null;
          if (existing) {
            await this.updateJob.execute({ ...(item as any), id: item.id ?? existing.id });
          } else {
            await this.createJob.execute(item as any);
          }
        }
        for (const item of dump.technologies ?? []) {
          await this.upsertTechnology.execute(item as any);
        }
      };

      if (this.prisma) {
        await this.prisma.$transaction(async () => {
          await applyWork();
        });
      } else {
        await applyWork();
      }
    } catch (e) {
      const err = { path: '(apply)', message: (e as Error).message };
      return this.makeResult(
        false,
        false,
        processedCounts,
        newCounts,
        updatedCounts,
        createdIds,
        updatedIds,
        newTotal,
        updatedTotal,
        [err],
        diff,
      );
    }

    return this.makeResult(
      false,
      true,
      processedCounts,
      newCounts,
      updatedCounts,
      createdIds,
      updatedIds,
      newTotal,
      updatedTotal,
      [],
      diff,
    );
  }

  private normalizeInput(
    payload: unknown,
    dryRunOverride?: boolean,
  ): { dump: unknown; dryRun: boolean } {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const rec = payload as Record<string, unknown>;
      if ('dump' in rec || 'dryRun' in rec) {
        const dryRun =
          typeof dryRunOverride === 'boolean'
            ? dryRunOverride
            : typeof rec.dryRun === 'boolean'
              ? rec.dryRun
              : true;
        return { dump: rec.dump, dryRun };
      }
    }
    const dryRun = typeof dryRunOverride === 'boolean' ? dryRunOverride : true;
    return { dump: payload, dryRun };
  }

  private makeResult(
    dryRun: boolean,
    willWrite: boolean,
    counts: ImportCountBreakdown,
    newCountsInput: ImportCountBreakdown,
    updatedCountsInput: ImportCountBreakdown,
    createdIds: ImportResult['createdIds'],
    updatedIds: ImportResult['updatedIds'],
    newTotal: number,
    updatedTotal: number,
    errors: Array<{ path: string; message: string }>,
    diff: string[],
  ): ImportResult {
    const newCounts = cloneCounts(newCountsInput);
    const updatedCounts = cloneCounts(updatedCountsInput);
    const clonedCounts = cloneCounts(counts);
    const normalizedErrors = errors.map((e) => ({ path: e.path, message: e.message }));
    const applied = !dryRun && normalizedErrors.length === 0 && willWrite;
    return {
      dryRun,
      willWrite,
      applied,
      counts: clonedCounts,
      newCounts,
      updatedCounts,
      createdIds,
      updatedIds,
      new: newTotal,
      updated: updatedTotal,
      errors: normalizedErrors,
      validationErrors: normalizedErrors,
      errorCount: normalizedErrors.length,
      diff,
    };
  }
}

import { ContactMessage } from '../domain/aggregates';
import { CONTACT_MESSAGE_REPOSITORY } from '../content.tokens';
import type { ContactMessageRepository } from '../domain/ports';

@Injectable()
export class CreateContactMessageUseCase {
  constructor(
    @Inject(CONTACT_MESSAGE_REPOSITORY) private readonly repo: ContactMessageRepository,
  ) {}
  async execute(cmd: CreateContactMessageCommand): Promise<{ id: string }> {
    const message = ContactMessage.create(cmd);
    const saved = await this.repo.save(message.toCreateInput() as any);
    return { id: (saved as { id: string }).id };
  }
}

import type { CreateContactMessageCommand } from './commands';
