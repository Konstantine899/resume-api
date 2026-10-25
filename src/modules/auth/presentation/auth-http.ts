import { UnauthorizedException } from '@nestjs/common';

import { InvalidCredentialsError, InvalidSessionError } from '../application/errors';
import type { TokenPair } from '../application/ports';

export const REFRESH_COOKIE_NAME = 'refresh_token';

/** Wire shape of login/refresh: the access token lives ONLY here (SPEC C1). */
export interface TokenPairResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export function toTokenPairResponse(pair: TokenPair): TokenPairResponse {
  return {
    accessToken: pair.accessToken,
    tokenType: 'Bearer',
    expiresIn: pair.expiresIn,
  };
}

/** Maps application errors to their generic HTTP shape (SPEC C2/C6/C7). */
export function mapAuthError(error: unknown): unknown {
  if (error instanceof InvalidCredentialsError) {
    return new UnauthorizedException({ statusCode: 401, message: 'Invalid credentials' });
  }
  if (error instanceof InvalidSessionError) {
    return new UnauthorizedException({ statusCode: 401, message: 'Invalid session' });
  }
  return error;
}
