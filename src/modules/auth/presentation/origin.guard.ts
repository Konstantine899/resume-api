import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { AUTH_CONFIG, type AuthConfig } from '../auth.tokens';

/**
 * Defense in depth for POST /auth/refresh (SPEC C10): the same-site topology
 * (OPEN-A1a) already shields the cookie with SameSite=Lax; this guard rejects
 * cross-origin browser calls explicitly. Requests without `Origin` and
 * `Sec-Fetch-Site` (curl, tests) pass — a non-browser client has no ambient
 * cookie jar to abuse.
 */
@Injectable()
export class RefreshOriginGuard implements CanActivate {
  constructor(@Inject(AUTH_CONFIG) private readonly config: AuthConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const origin = req.headers.origin;
    if (origin !== undefined && origin !== this.config.frontendOrigin) {
      throw new ForbiddenException({ statusCode: 403, message: 'Forbidden origin' });
    }

    const site = req.headers['sec-fetch-site'];
    if (site !== undefined && site !== 'same-origin' && site !== 'none') {
      throw new ForbiddenException({ statusCode: 403, message: 'Forbidden origin' });
    }

    return true;
  }
}
