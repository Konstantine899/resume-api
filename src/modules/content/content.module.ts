import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { UploadController } from './presentation/upload.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  PrismaAboutRepository,
  PrismaContactRepository,
  PrismaJobRepository,
  PrismaProjectRepository,
  PrismaSkillCategoryRepository,
  PrismaTechnologyRepository,
} from './infrastructure/prisma-content.repository';
import { PrismaContactMessageRepository } from './infrastructure/prisma-contact-message.repository';
import { PrismaSiteSettingsRepository } from './infrastructure/prisma-site-settings.repository';
import {
  ABOUT_REPOSITORY,
  CONTACT_REPOSITORY,
  JOB_REPOSITORY,
  PROJECT_REPOSITORY,
  SITE_SETTINGS_REPOSITORY,
  SKILL_CATEGORY_REPOSITORY,
  TECHNOLOGY_REPOSITORY,
  CONTACT_MESSAGE_REPOSITORY,
} from './content.tokens';
import {
  CreateJobUseCase,
  CreateContactMessageUseCase,
  CreateProjectUseCase,
  DeleteJobUseCase,
  DeleteProjectUseCase,
  DeleteSkillCategoryUseCase,
  DeleteTechnologyUseCase,
  DryRunContentImporter,
  GetAboutUseCase,
  GetContactUseCase,
  GetJobUseCase,
  GetSiteSettingsUseCase,
  GetProjectUseCase,
  ListJobsUseCase,
  ListProjectsUseCase,
  ListSkillCategoriesUseCase,
  ListTechnologiesUseCase,
  UpdateJobUseCase,
  UpdateProjectUseCase,
  UpdateSiteSettingsUseCase,
  UpsertAboutUseCase,
  UpsertContactUseCase,
  UpsertSkillCategoryUseCase,
  UpsertTechnologyUseCase,
} from './application/use-cases';
import { RolesGuard } from './presentation/roles.guard';
import {
  AboutController,
  ContactController,
  JobController,
  ProjectController,
  SkillController,
  TechnologyController,
} from './presentation/content.controller';
import { ContentImportController } from './presentation/import.controller';
import { SiteSettingsController } from './presentation/site-settings.controller';
import { ContactMessageController } from './presentation/contact-message.controller';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [
    UploadController,
    AboutController,
    ContactController,
    ProjectController,
    SkillController,
    JobController,
    TechnologyController,
    ContentImportController,
    SiteSettingsController,
    ContactMessageController,
  ],
  providers: [
    { provide: ABOUT_REPOSITORY, useClass: PrismaAboutRepository },
    { provide: CONTACT_REPOSITORY, useClass: PrismaContactRepository },
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: SKILL_CATEGORY_REPOSITORY, useClass: PrismaSkillCategoryRepository },
    { provide: JOB_REPOSITORY, useClass: PrismaJobRepository },
    { provide: TECHNOLOGY_REPOSITORY, useClass: PrismaTechnologyRepository },
    { provide: SITE_SETTINGS_REPOSITORY, useClass: PrismaSiteSettingsRepository },
    { provide: CONTACT_MESSAGE_REPOSITORY, useClass: PrismaContactMessageRepository },
    GetAboutUseCase,
    UpsertAboutUseCase,
    GetContactUseCase,
    UpsertContactUseCase,
    ListProjectsUseCase,
    GetProjectUseCase,
    GetSiteSettingsUseCase,
    CreateProjectUseCase,
    UpdateProjectUseCase,
    DeleteProjectUseCase,
    ListSkillCategoriesUseCase,
    UpsertSkillCategoryUseCase,
    DeleteSkillCategoryUseCase,
    ListJobsUseCase,
    GetJobUseCase,
    CreateJobUseCase,
    UpdateJobUseCase,
    UpdateSiteSettingsUseCase,
    CreateContactMessageUseCase,
    DeleteJobUseCase,
    ListTechnologiesUseCase,
    UpsertTechnologyUseCase,
    DeleteTechnologyUseCase,
    DryRunContentImporter,
    RolesGuard,
    PrismaAboutRepository,
    PrismaContactRepository,
    PrismaProjectRepository,
    PrismaSkillCategoryRepository,
    PrismaJobRepository,
    PrismaTechnologyRepository,
    PrismaSiteSettingsRepository,
    PrismaContactMessageRepository,
  ],
  exports: [DryRunContentImporter],
})
export class ContentModule {}
