import { Injectable, ForbiddenException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthRequest } from '../../auth/presentation/jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const role = req.user?.role;
    if (role !== 'admin') {
      throw new ForbiddenException({ statusCode: 403, message: 'Forbidden' });
    }
    return true;
  }
}
