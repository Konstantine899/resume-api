import { Inject, Injectable } from '@nestjs/common';

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

// Dry-run importer ACL stub
@Injectable()
export class DryRunContentImporter {
  async execute(_payload: unknown): Promise<{ diff: string[]; willWrite: boolean }> {
    void _payload;
    return { diff: [], willWrite: false };
  }
}
