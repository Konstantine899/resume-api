import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import {
  PrismaAboutRepository,
  PrismaContactRepository,
  PrismaJobRepository,
  PrismaProjectRepository,
  PrismaSkillCategoryRepository,
  PrismaTechnologyRepository,
} from './infrastructure/prisma-content.repository';
import {
  ABOUT_REPOSITORY,
  CONTACT_REPOSITORY,
  JOB_REPOSITORY,
  PROJECT_REPOSITORY,
  SKILL_CATEGORY_REPOSITORY,
  TECHNOLOGY_REPOSITORY,
} from './content.tokens';
import {
  CreateJobUseCase,
  CreateProjectUseCase,
  DeleteJobUseCase,
  DeleteProjectUseCase,
  DeleteSkillCategoryUseCase,
  DeleteTechnologyUseCase,
  DryRunContentImporter,
  GetAboutUseCase,
  GetContactUseCase,
  GetJobUseCase,
  GetProjectUseCase,
  ListJobsUseCase,
  ListProjectsUseCase,
  ListSkillCategoriesUseCase,
  ListTechnologiesUseCase,
  UpdateJobUseCase,
  UpdateProjectUseCase,
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

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    AboutController,
    ContactController,
    ProjectController,
    SkillController,
    JobController,
    TechnologyController,
    ContentImportController,
  ],
  providers: [
    { provide: ABOUT_REPOSITORY, useClass: PrismaAboutRepository },
    { provide: CONTACT_REPOSITORY, useClass: PrismaContactRepository },
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: SKILL_CATEGORY_REPOSITORY, useClass: PrismaSkillCategoryRepository },
    { provide: JOB_REPOSITORY, useClass: PrismaJobRepository },
    { provide: TECHNOLOGY_REPOSITORY, useClass: PrismaTechnologyRepository },
    GetAboutUseCase,
    UpsertAboutUseCase,
    GetContactUseCase,
    UpsertContactUseCase,
    ListProjectsUseCase,
    GetProjectUseCase,
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
  ],
  exports: [DryRunContentImporter],
})
export class ContentModule {}
