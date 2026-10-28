import { ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';

import { UserAccountsService } from '../../users/application/user-accounts.service';
import type { AuthRequest } from '../../auth/presentation/jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Optional()
    @Inject(UserAccountsService)
    private readonly accounts?: UserAccountsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!req.user) {
      throw new ForbiddenException({ statusCode: 403, message: 'Forbidden' });
    }

    if (this.accounts) {
      const profile = await this.accounts.findProfileById(req.user.sub);
      if (!profile || profile.role !== 'admin') {
        throw new ForbiddenException({ statusCode: 403, message: 'Forbidden' });
      }
      return true;
    }

    if (req.user.role !== 'admin') {
      throw new ForbiddenException({ statusCode: 403, message: 'Forbidden' });
    }
    return true;
  }
}
