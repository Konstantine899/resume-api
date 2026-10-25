/**
 * Runtime configuration of the auth module, assembled once from the validated
 * environment (composition root). NEVER log this object: it carries the JWT
 * secret.
 */
export interface AuthConfig {
  /** Single CORS origin of the frontend (FRONTEND_ORIGIN). */
  frontendOrigin: string;
  /** Path of the refresh cookie (COOKIE_PATH). */
  cookiePath: string;
  /** JWT_SECRET — in-memory only, never persisted or logged. */
  jwtSecret: string;
}
