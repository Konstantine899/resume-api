import type { IncomingMessage } from 'node:http';

import pino, { type DestinationStream } from 'pino';
import { describe, expect, it } from 'vitest';

import { parseEnv } from '../config/env';
import { createPinoOptions, genReqId } from './pino';

const env = parseEnv({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/resume_api_test',
  JWT_SECRET: 'x'.repeat(48),
});

function capture(): { stream: DestinationStream; lines: () => string[] } {
  const chunks: string[] = [];
  return {
    stream: { write: (chunk: string) => chunks.push(chunk) },
    lines: () => chunks,
  };
}

describe('createPinoOptions', () => {
  it('redacts credentials, tokens and cookies', () => {
    const { stream, lines } = capture();
    const logger = pino(createPinoOptions(env), stream);

    logger.info(
      {
        req: {
          headers: {
            authorization: 'Bearer super-secret-token',
            cookie: 'session=abcdef',
            'x-request-id': 'kept',
          },
        },
        password: 'hunter2',
        token: 'jwt-value',
        nested: { secret: 'shhh', accessToken: 'at-value' },
      },
      'incoming request',
    );

    const output = lines().join('');
    expect(output).not.toContain('super-secret-token');
    expect(output).not.toContain('session=abcdef');
    expect(output).not.toContain('hunter2');
    expect(output).not.toContain('jwt-value');
    expect(output).not.toContain('shhh');
    expect(output).not.toContain('at-value');
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('kept');
  });

  it('logs at info level in production and debug elsewhere', () => {
    expect(createPinoOptions(env).level).toBe('debug');
    expect(createPinoOptions({ ...env, NODE_ENV: 'production' }).level).toBe('info');
  });
});

describe('genReqId', () => {
  const asRequest = (headers: IncomingMessage['headers']): IncomingMessage =>
    ({ headers }) as IncomingMessage;

  it('reuses an inbound correlation id', () => {
    expect(genReqId(asRequest({ 'x-request-id': 'corr-from-client' }))).toBe('corr-from-client');
  });

  it('mints a uuid when the caller provides none', () => {
    expect(genReqId(asRequest({}))).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
