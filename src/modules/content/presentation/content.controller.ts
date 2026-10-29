import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import type { AboutContentProps } from '../domain/aggregates';
import type { Response } from 'express';
import {
  aboutUpsertSchema,
  contactUpsertSchema,
  projectCreateSchema,
  projectUpdateSchema,
  skillCategoryUpsertSchema,
  technologyUpsertSchema,
  jobCreateSchema,
  jobUpdateSchema,
} from './content.schemas';
import {
  UpsertAboutUseCase,
  GetAboutUseCase,
  UpsertContactUseCase,
  GetContactUseCase,
  CreateProjectUseCase,
  UpdateProjectUseCase,
  DeleteProjectUseCase,
  GetProjectUseCase,
  ListProjectsUseCase,
  UpsertSkillCategoryUseCase,
  DeleteSkillCategoryUseCase,
  ListSkillCategoriesUseCase,
  CreateJobUseCase,
  UpdateJobUseCase,
  DeleteJobUseCase,
  GetJobUseCase,
  ListJobsUseCase,
  UpsertTechnologyUseCase,
  DeleteTechnologyUseCase,
  ListTechnologiesUseCase,
} from '../application/use-cases';
import type {
  AboutUpsertCommand,
  ContactUpsertCommand,
  ProjectCreateCommand,
  ProjectUpdateCommand,
  SkillCategoryUpsertCommand,
  TechnologyUpsertCommand,
  JobCreateCommand,
  JobUpdateCommand,
} from '../application/commands';

const GUARDS = [JwtAuthGuard, RolesGuard];

function parseOrThrow<T>(
  schema: {
    safeParse: (v: unknown) => { success: boolean; data?: unknown; error?: { message: string } };
  },
  body: unknown,
): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    throw new BadRequestException({
      tag: 'content.validation',
      message: r.error?.message ?? 'invalid body',
    });
  }
  return r.data as T;
}

@Controller('about')
export class AboutController {
  constructor(
    private readonly getAbout: GetAboutUseCase,
    private readonly upsertAbout: UpsertAboutUseCase,
  ) {}
  @Get() async get() {
    const result = await this.getAbout.execute();
    return result ? result.toProps() : null;
  }
  @Put()
  @UseGuards(...GUARDS)
  async upsert(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AboutContentProps> {
    const cmd: AboutUpsertCommand = parseOrThrow<AboutUpsertCommand>(aboutUpsertSchema, body);
    const result = await this.upsertAbout.execute(cmd);
    if (result.replacedMediaKey) {
      res.setHeader('X-Replaced-Media-Key', result.replacedMediaKey);
    }
    return result.content.toProps();
  }
}

@Controller('contact')
export class ContactController {
  constructor(
    private readonly getContact: GetContactUseCase,
    private readonly upsertContact: UpsertContactUseCase,
  ) {}
  @Get() get() {
    return this.getContact.execute();
  }
  @Put() @UseGuards(...GUARDS) upsert(@Body() body: unknown) {
    const cmd: ContactUpsertCommand = parseOrThrow<ContactUpsertCommand>(contactUpsertSchema, body);
    return this.upsertContact.execute(cmd);
  }
}

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly list: ListProjectsUseCase,
    private readonly get: GetProjectUseCase,
    private readonly create: CreateProjectUseCase,
    private readonly update: UpdateProjectUseCase,
    private readonly remove: DeleteProjectUseCase,
  ) {}
  @Get() listAll() {
    return this.list.execute();
  }
  @Get(':id') getOne(@Param('id') id: string) {
    return this.get.execute(id);
  }
  @Post() @UseGuards(...GUARDS) createOne(@Body() body: unknown) {
    const cmd: ProjectCreateCommand = parseOrThrow<ProjectCreateCommand>(projectCreateSchema, body);
    return this.create.execute(cmd);
  }
  @Put(':id') @UseGuards(...GUARDS) updateOne(@Param('id') id: string, @Body() body: unknown) {
    const cmd: ProjectUpdateCommand = parseOrThrow<ProjectUpdateCommand>(projectUpdateSchema, body);
    cmd.id = id;
    return this.update.execute(cmd);
  }
  @Delete(':id') @UseGuards(...GUARDS) removeOne(@Param('id') id: string) {
    return this.remove.execute(id);
  }
}

@Controller('skills')
export class SkillController {
  constructor(
    private readonly list: ListSkillCategoriesUseCase,
    private readonly upsert: UpsertSkillCategoryUseCase,
    private readonly remove: DeleteSkillCategoryUseCase,
  ) {}
  @Get() listAll() {
    return this.list.execute();
  }
  @Put() @UseGuards(...GUARDS) upsertOne(@Body() body: unknown) {
    const cmd: SkillCategoryUpsertCommand = parseOrThrow<SkillCategoryUpsertCommand>(
      skillCategoryUpsertSchema,
      body,
    );
    return this.upsert.execute(cmd);
  }
  @Delete(':category') @UseGuards(...GUARDS) removeOne(@Param('category') category: string) {
    return this.remove.execute(category);
  }
}

@Controller('jobs')
export class JobController {
  constructor(
    private readonly list: ListJobsUseCase,
    private readonly get: GetJobUseCase,
    private readonly create: CreateJobUseCase,
    private readonly update: UpdateJobUseCase,
    private readonly remove: DeleteJobUseCase,
  ) {}
  @Get() listAll() {
    return this.list.execute();
  }
  @Get(':id') getOne(@Param('id') id: string) {
    return this.get.execute(id);
  }
  @Post() @UseGuards(...GUARDS) createOne(@Body() body: unknown) {
    const cmd: JobCreateCommand = parseOrThrow<JobCreateCommand>(jobCreateSchema, body);
    return this.create.execute(cmd);
  }
  @Put(':id') @UseGuards(...GUARDS) updateOne(@Param('id') id: string, @Body() body: unknown) {
    const cmd: JobUpdateCommand = parseOrThrow<JobUpdateCommand>(jobUpdateSchema, body);
    cmd.id = id;
    return this.update.execute(cmd);
  }
  @Delete(':id') @UseGuards(...GUARDS) removeOne(@Param('id') id: string) {
    return this.remove.execute(id);
  }
}

@Controller('technologies')
export class TechnologyController {
  constructor(
    private readonly list: ListTechnologiesUseCase,
    private readonly upsert: UpsertTechnologyUseCase,
    private readonly remove: DeleteTechnologyUseCase,
  ) {}
  @Get() listAll() {
    return this.list.execute();
  }
  @Put() @UseGuards(...GUARDS) upsertOne(@Body() body: unknown) {
    const cmd: TechnologyUpsertCommand = parseOrThrow<TechnologyUpsertCommand>(
      technologyUpsertSchema,
      body,
    );
    return this.upsert.execute(cmd);
  }
  @Delete(':key') @UseGuards(...GUARDS) removeOne(@Param('key') key: string) {
    return this.remove.execute(key);
  }
}
