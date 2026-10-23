import { describe, expect, it } from 'vitest';

import { loadEnv, shannonEntropy } from './env';

const VALID_ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/resume_api?schema=public',
  JWT_ACCESS_SECRET: 'xK9$mQ2pL7vN4wR8tY6bD3fH5jG1cZ0sAeU',
  JWT_REFRESH_SECRET: 'gT4#nB8kJ2mX6qW9rE1yU5iO3pA7sD0fHl',
};

describe('shannonEntropy', () => {
  it('returns 0 for a single repeated character', () => {
    expect(shannonEntropy('aaaaaaaaaa')).toBe(0);
  });

  it('computes the expected values for uniform alphabets', () => {
    expect(shannonEntropy('abcdabcdabcd')).toBeCloseTo(2, 5);
    expect(shannonEntropy('abcdefgh')).toBeCloseTo(3, 5);
  });

  it('returns ~5 bits/char for a realistic random base64 secret', () => {
    const secret = 'xK9$mQ2pL7vN4wR8tY6bD3fH5jG1cZ0sAeU';
    expect(shannonEntropy(secret)).toBeGreaterThan(4.5);
  });

  it('returns 0 for an empty string', () => {
    expect(shannonEntropy('')).toBe(0);
  });
});

describe('envSchema / loadEnv', () => {
  it('accepts a valid environment and applies defaults', () => {
    const env = loadEnv({ ...VALID_ENV });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.SWAGGER_ENABLED).toBe(false);
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces PORT from a string and rejects out-of-range values', () => {
    expect(loadEnv({ ...VALID_ENV, PORT: '8080' }).PORT).toBe(8080);
    expect(() => loadEnv({ ...VALID_ENV, PORT: '0' })).toThrow(/PORT/u);
    expect(() => loadEnv({ ...VALID_ENV, PORT: 'abc' })).toThrow(/PORT/u);
  });

  it('parses SWAGGER_ENABLED into a boolean', () => {
    expect(loadEnv({ ...VALID_ENV, SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED).toBe(true);
    expect(loadEnv({ ...VALID_ENV, SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED).toBe(false);
  });

  it('fails with a readable error when a JWT secret is missing', () => {
    expect(() =>
      loadEnv({
        DATABASE_URL: VALID_ENV.DATABASE_URL,
        JWT_REFRESH_SECRET: VALID_ENV.JWT_REFRESH_SECRET,
      }),
    ).toThrow(/JWT_ACCESS_SECRET/u);
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => loadEnv({ ...VALID_ENV, JWT_ACCESS_SECRET: 'short-secret' })).toThrow(
      /at least 32 characters/u,
    );
  });

  it('rejects a long but low-entropy JWT secret', () => {
    expect(() => loadEnv({ ...VALID_ENV, JWT_ACCESS_SECRET: 'a'.repeat(40) })).toThrow(/entropy/u);
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() => loadEnv({ ...VALID_ENV, DATABASE_URL: 'http://example.com' })).toThrow(
      /postgresql:\/\//u,
    );
  });

  it('rejects an unknown NODE_ENV / LOG_LEVEL', () => {
    expect(() => loadEnv({ ...VALID_ENV, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/u);
    expect(() => loadEnv({ ...VALID_ENV, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/u);
  });

  it('ignores unknown keys instead of failing', () => {
    const env = loadEnv({ ...VALID_ENV, UNRELATED: 'value' });
    expect(env).not.toHaveProperty('UNRELATED');
  });
});
