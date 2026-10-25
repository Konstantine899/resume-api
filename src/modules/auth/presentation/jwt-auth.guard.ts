import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { AccessTokenIssuer } from '../domain/ports';
import type { AccessTokenClaims } from '../domain/token-claims';
import { ACCESS_TOKEN_ISSUER } from '../auth.tokens';

/** Express request carrying the verified access-token claims. */
export interface AuthRequest extends Request {
  user?: AccessTokenClaims;
}

export const AUTH_REQUIRED = {
  statusCode: 401,
  message: 'Authentication required',
} as const;

/**
 * Validates the `Authorization: Bearer <access>` header (SPEC C16). Exported
 * from the auth module so Step 4 content write-endpoints can reuse it.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(ACCESS_TOKEN_ISSUER) private readonly issuer: AccessTokenIssuer) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!match) {
      throw new UnauthorizedException(AUTH_REQUIRED);
    }
    try {
      req.user = this.issuer.verify(match[1]);
      return true;
    } catch {
      // Expired / tampered / wrong-typ token — generic 401, no details.
      throw new UnauthorizedException(AUTH_REQUIRED);
    }
  }
}
