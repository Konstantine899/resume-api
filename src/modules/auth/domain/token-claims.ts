/** The roles that can appear in an access token. */
export type TokenRole = 'admin' | 'user';

/** Claims carried by the 15-minute access token (kept in memory on the client). */
export interface AccessTokenClaims {
  sub: string;
  role: TokenRole;
  typ: 'access';
  iat?: number;
  exp?: number;
}
