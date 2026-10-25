import { describe, expect, it, vi } from 'vitest';

import { EnvValidationError, parseEnv, validateEnv } from './env';

const VALID_SOURCE: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  PORT: '4000',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/resume_api_test',
  JWT_SECRET: 'a'.repeat(48),
  SWAGGER_ENABLED: 'false',
};

describe('parseEnv', () => {
  it('accepts a complete, valid environment', () => {
    expect(parseEnv(VALID_SOURCE)).toEqual({
      NODE_ENV: 'test',
      PORT: 4000,
      DATABASE_URL: VALID_SOURCE.DATABASE_URL,
      JWT_SECRET: 'a'.repeat(48),
      SWAGGER_ENABLED: false,
    });
  });

  it('rejects a JWT_SECRET shorter than 32 bytes', () => {
    expect(() => parseEnv({ ...VALID_SOURCE, JWT_SECRET: 'too-short' })).toThrow(
      /JWT_SECRET must be at least 32 bytes \(got 9\)/,
    );
  });

  it('rejects a missing JWT_SECRET', () => {
    const source = { ...VALID_SOURCE };
    delete source.JWT_SECRET;
    expect(() => parseEnv(source)).toThrow(/JWT_SECRET/);
  });

  it('measures JWT_SECRET entropy in bytes, not characters', () => {
    // 20 Cyrillic characters = 40 UTF-8 bytes -> long enough.
    const cyrillic = 'секрет'.padEnd(20, 'я');
    expect(() => parseEnv({ ...VALID_SOURCE, JWT_SECRET: cyrillic })).not.toThrow();
    // 10 Cyrillic characters = 20 UTF-8 bytes -> too short.
    expect(() => parseEnv({ ...VALID_SOURCE, JWT_SECRET: 'секретный' })).toThrow(
      /JWT_SECRET must be at least 32 bytes/,
    );
  });

  it('rejects an invalid PORT, NODE_ENV and DATABASE_URL', () => {
    expect(() => parseEnv({ ...VALID_SOURCE, PORT: 'not-a-number' })).toThrow(/PORT/);
    expect(() => parseEnv({ ...VALID_SOURCE, PORT: '70000' })).toThrow(/PORT/);
    expect(() => parseEnv({ ...VALID_SOURCE, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ ...VALID_SOURCE, DATABASE_URL: 'sqlite://nope' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects an unparsable SWAGGER_ENABLED flag', () => {
    expect(() => parseEnv({ ...VALID_SOURCE, SWAGGER_ENABLED: 'maybe' })).toThrow(
      /SWAGGER_ENABLED/,
    );
  });

  it('defaults PORT, NODE_ENV and SWAGGER_ENABLED', () => {
    const env = parseEnv({
      DATABASE_URL: VALID_SOURCE.DATABASE_URL,
      JWT_SECRET: 'a'.repeat(48),
    });
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.SWAGGER_ENABLED).toBe(false);
  });

  it('formats every failing field in the error message', () => {
    try {
      parseEnv({ ...VALID_SOURCE, JWT_SECRET: 'short', NODE_ENV: 'nope' });
      expect.unreachable('parseEnv should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      expect((error as EnvValidationError).message).toMatch(/NODE_ENV/);
      expect((error as EnvValidationError).message).toMatch(/JWT_SECRET/);
    }
  });
});

describe('validateEnv', () => {
  it('exits with code 1 when the environment is invalid', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    validateEnv({ ...VALID_SOURCE, JWT_SECRET: 'short' });

    expect(exit).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('JWT_SECRET'));
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Refusing to start'));

    exit.mockRestore();
    error.mockRestore();
  });

  it('returns the parsed environment when everything is valid', () => {
    expect(validateEnv(VALID_SOURCE).PORT).toBe(4000);
  });
});
