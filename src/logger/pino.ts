import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import pino, { type Logger, type LoggerOptions } from 'pino';

import type { Env } from '../config/env';

/**
 * Values that must never reach the log stream: credentials, tokens, cookies.
 * pino applies these paths to every serialized object.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'headers.authorization',
  'headers.cookie',
  'password',
  'token',
  'secret',
  'jwt',
  '*.password',
  '*.token',
  '*.secret',
  '*.jwt',
  '*.accessToken',
  '*.refreshToken',
];

export function createPinoOptions(env: Env): LoggerOptions {
  return {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    base: { service: 'resume-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
  };
}

export function createRootLogger(env: Env): Logger {
  return pino(createPinoOptions(env));
}

/**
 * Reuses an inbound correlation id when the caller provides one, otherwise
 * mints a new one. pino-http stores the result on `req.id`, which is then
 * echoed back in the `x-request-id` response header.
 */
export function genReqId(req: IncomingMessage): string {
  const inbound = req.headers['x-request-id'];
  const value = Array.isArray(inbound) ? inbound[0] : inbound;
  return value && value.length > 0 ? value : randomUUID();
}

export function readRequestId(req: IncomingMessage): string | undefined {
  const { id } = req;
  if (id === undefined || id === null) {
    return undefined;
  }
  return typeof id === 'string' ? id : String(id);
}
