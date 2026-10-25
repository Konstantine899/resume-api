import { JwtService } from '@nestjs/jwt';

import { ACCESS_TOKEN_TTL_SECONDS } from '../domain/constants';
import type { AccessTokenClaims, TokenRole } from '../domain/token-claims';
import type { AccessTokenIssuer } from '../domain/ports';

/**
 * Access-token issuer: 15-minute JWT kept in the client's memory only
 * (never in a cookie, never in localStorage — SPEC C1).
 */
export class JwtAccessTokenIssuer implements AccessTokenIssuer {
  private readonly jwt: JwtService;

  constructor(secret: string) {
    this.jwt = new JwtService({
      secret,
      signOptions: { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    });
  }

  sign(input: { sub: string; role: TokenRole }): string {
    return this.jwt.sign<AccessTokenClaims>({ ...input, typ: 'access' });
  }

  verify(token: string): AccessTokenClaims {
    return this.jwt.verify<AccessTokenClaims>(token);
  }
}
