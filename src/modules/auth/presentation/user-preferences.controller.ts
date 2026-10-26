import { Body, Controller, Inject, NotFoundException, Patch, Req, UseGuards } from '@nestjs/common';

import { UserAccountsService } from '../../users/application/user-accounts.service';
import { JwtAuthGuard, type AuthRequest } from './jwt-auth.guard';
import { parseBody } from './validation';
import { z } from 'zod';

export const userPreferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark']).optional(),
    language: z.enum(['en', 'ru']).optional(),
  })
  .strict();

export type UserPreferencesBody = z.output<typeof userPreferencesSchema>;

@Controller('users')
export class UserPreferencesController {
  constructor(@Inject(UserAccountsService) private readonly accounts: UserAccountsService) {}

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  async updatePreferences(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ): Promise<{
    id: string;
    email: string;
    role: string;
    theme: string;
    language: string;
  }> {
    const command = parseBody(userPreferencesSchema, body);
    if (!req.user) {
      throw new NotFoundException();
    }
    const profile = await this.accounts.updatePreferences(req.user.sub, command);
    if (!profile) {
      throw new NotFoundException();
    }
    return profile;
  }
}
