import type { AboutContent } from './aggregates';
import type { ContactContent } from './aggregates';
import type { Project } from './aggregates';
import type { SkillCategory } from './aggregates';
import type { Job } from './aggregates';
import type { Technology } from './aggregates';

export interface AboutRepository {
  get(): Promise<AboutContent | null>;
  save(entity: AboutContent): Promise<void>;
}

export interface ContactRepository {
  get(): Promise<ContactContent | null>;
  save(entity: ContactContent): Promise<void>;
}

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  list(): Promise<Project[]>;
  save(entity: Project): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface SkillCategoryRepository {
  findByCategory(category: string): Promise<SkillCategory | null>;
  list(): Promise<SkillCategory[]>;
  save(entity: SkillCategory): Promise<void>;
  delete(category: string): Promise<void>;
}

export interface JobRepository {
  findById(id: string): Promise<Job | null>;
  list(): Promise<Job[]>;
  save(entity: Job): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TechnologyRepository {
  findByKey(key: string): Promise<Technology | null>;
  list(): Promise<Technology[]>;
  save(entity: Technology): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface SiteSettingsRecord {
  id: string;
  resumeUrl: string | null;
  updatedAt: Date;
}

export interface SiteSettingsRepository {
  get(): Promise<SiteSettingsRecord | null>;
  save(resumeUrl: string | null): Promise<SiteSettingsRecord>;
}

export type ContentUpdatedAction = 'create' | 'update' | 'delete';

export interface ContentUpdatedEvent {
  aggregate: string;
  id: string;
  action: ContentUpdatedAction;
  occurredAt: Date;
}

export interface ContactMessagePropsForRepo {
  id: string;
  email: string;
  subject?: string;
  body: string;
  source?: string;
  locale?: string;
  status: string;
  createdAt: Date;
  readAt?: Date;
  repliedAt?: Date;
}

export interface ContactMessageRepository {
  save(entity: ContactMessagePropsForRepo): Promise<ContactMessagePropsForRepo>;
  findById(id: string): Promise<ContactMessagePropsForRepo | null>;
  list(options?: {
    status?: string;
    skip?: number;
    take?: number;
  }): Promise<ContactMessagePropsForRepo[]>;
  updateStatus(id: string, status: string, at?: Date): Promise<ContactMessagePropsForRepo | null>;
}
