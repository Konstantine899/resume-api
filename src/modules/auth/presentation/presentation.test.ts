import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookieOptions,
  readCookie,
  refreshCookieOptions,
} from './cookie';
import { AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, ipAndLoginTracker } from './throttle';
import { loginSchema } from './schemas';
import { parseBody } from './validation';

describe('refresh cookie flags (SPEC C9)', () => {
  it('sets HttpOnly, SameSite=Lax, Secure, scoped path and 30-day Max-Age', () => {
    const options = refreshCookieOptions('/auth');

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
    expect(options.secure).toBe(true);
    expect(options.path).toBe('/auth');
    expect(options.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
    expect(REFRESH_COOKIE_NAME).toBe('refresh_token');
  });

  it('clear-cookie options match the set-cookie attributes (minus lifetime)', () => {
    const options = clearRefreshCookieOptions('/api/auth');

    expect(options).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/api/auth',
    });
  });
});

describe('readCookie', () => {
  it('extracts the named cookie from the header', () => {
    expect(readCookie('a=1; refresh_token=abc; b=2', REFRESH_COOKIE_NAME)).toBe('abc');
    expect(readCookie('refresh_token=only', REFRESH_COOKIE_NAME)).toBe('only');
  });

  it('returns null for a missing header or missing cookie', () => {
    expect(readCookie(undefined, REFRESH_COOKIE_NAME)).toBeNull();
    expect(readCookie('other=value', REFRESH_COOKIE_NAME)).toBeNull();
    expect(readCookie('refresh_token=', REFRESH_COOKIE_NAME)).toBe('');
  });
});

describe('throttler tracker (SPEC C3/C15)', () => {
  it('keys on IP + normalized login', () => {
    expect(ipAndLoginTracker({ ip: '127.0.0.1', body: { email: ' Owner@Test.LOCAL ' } })).toBe(
      '127.0.0.1|owner@test.local',
    );
    expect(ipAndLoginTracker({ ip: '127.0.0.1', body: undefined })).toBe('127.0.0.1|');
    expect(ipAndLoginTracker({ socket: { remoteAddress: '10.0.0.1' }, body: { email: 42 } })).toBe(
      '10.0.0.1|',
    );
  });

  it('pins the auth rate: 5 attempts per 60 seconds', () => {
    expect(AUTH_RATE_LIMIT).toBe(5);
    expect(AUTH_RATE_WINDOW_MS).toBe(60_000);
  });
});

describe('login body validation (defense in depth)', () => {
  it('accepts a valid body', () => {
    expect(parseBody(loginSchema, { email: 'a@b.co', password: 'x' })).toEqual({
      email: 'a@b.co',
      password: 'x',
    });
  });

  it('rejects unknown fields (mass assignment) and malformed input', () => {
    expect(() => parseBody(loginSchema, { email: 'a@b.co', password: 'x', role: 'admin' })).toThrow(
      BadRequestException,
    );
    expect(() => parseBody(loginSchema, { email: 'nope', password: 'x' })).toThrow(
      BadRequestException,
    );
    expect(() => parseBody(loginSchema, undefined)).toThrow(BadRequestException);
  });
});
