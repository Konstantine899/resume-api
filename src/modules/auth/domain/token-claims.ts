/** The only role that exists on this personal site. */
export type TokenRole = 'admin';

/** Claims carried by the 15-minute access token (kept in memory on the client). */
export interface AccessTokenClaims {
  sub: string;
  role: TokenRole;
  typ: 'access';
  iat?: number;
  exp?: number;
}
