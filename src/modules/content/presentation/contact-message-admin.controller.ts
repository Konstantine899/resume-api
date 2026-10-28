import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { Inject } from '@nestjs/common';
import {
  ListContactMessagesUseCase,
  UpdateContactMessageStatusUseCase,
} from '../application/use-cases';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { ContentValidationError } from '../application/errors';

const GUARDS = [JwtAuthGuard, RolesGuard];

const patchSchema = z.object({ status: z.enum(['NEW', 'READ', 'REPLIED']) });

@Controller('admin/contact/messages')
export class ContactMessageAdminController {
  constructor(
    @Inject(ListContactMessagesUseCase) private readonly listUseCase: ListContactMessagesUseCase,
    @Inject(UpdateContactMessageStatusUseCase)
    private readonly updateUseCase: UpdateContactMessageStatusUseCase,
  ) {}

  @Get()
  @UseGuards(...GUARDS)
  async list(
    @Query('skip') skipRaw?: string,
    @Query('take') takeRaw?: string,
    @Query('status') status?: string,
  ) {
    const skip = Number(skipRaw ?? 0);
    const take = Math.min(Number(takeRaw ?? 20), 50);
    const safeSkip = Number.isFinite(skip) && skip >= 0 ? skip : 0;
    const safeTake = Number.isFinite(take) && take > 0 ? take : 20;
    return this.listUseCase.execute({ skip: safeSkip, take: safeTake, status: status ?? 'ALL' });
  }

  @Patch(':id')
  @UseGuards(...GUARDS)
  async updateStatus(@Param() params: { id: string }, @Body() body: unknown) {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      throw new ContentValidationError(parsed.error.issues[0]?.message ?? 'invalid request body');
    }
    const id = params.id?.trim();
    if (!id) throw new ContentValidationError('id is required');
    return this.updateUseCase.execute(id, parsed.data.status);
  }
}
