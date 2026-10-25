import type { CookieOptions } from 'express';

import { REFRESH_TOKEN_TTL_SECONDS } from '../domain/constants';
import { REFRESH_COOKIE_NAME } from './auth-http';

/**
 * Flags of the refresh cookie (SPEC C9):
 *  - HttpOnly  — JS can never read the refresh token;
 *  - SameSite=Lax + Secure — fixed topology (OPEN-A1a: same-site via proxy);
 *  - Secure ALWAYS on: browsers accept `Secure` on http://localhost, and the
 *    e2e tests read the `set-cookie` header manually instead of relying on a
 *    cookie jar persisting Secure cookies over plain http;
 *  - Path scoped to the auth endpoints (refresh + logout).
 */
export function refreshCookieOptions(cookiePath: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: cookiePath,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
}

/** Same attributes minus lifetime — used with `res.clearCookie` (SPEC C8). */
export function clearRefreshCookieOptions(cookiePath: string): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: cookiePath,
  };
}

/** Minimal cookie-header reader (no cookie-parser dependency: one cookie). */
export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) {
    return null;
  }
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    if (part.slice(0, eq).trim() === name) {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

export { REFRESH_COOKIE_NAME };
