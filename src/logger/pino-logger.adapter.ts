import { LoggerService } from '@nestjs/common';

import type { Logger } from 'pino';

function serialize(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Routes Nest's own lifecycle logs through pino so the whole application emits
 * one log format with the same redaction rules as the HTTP logs.
 */
export class PinoLoggerAdapter implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.info(this.format(message, optionalParams));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.error(this.format(message, optionalParams));
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.warn(this.format(message, optionalParams));
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.debug(this.format(message, optionalParams));
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.trace(this.format(message, optionalParams));
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.logger.fatal(this.format(message, optionalParams));
  }

  private format(message: unknown, params: readonly unknown[]): string {
    return [message, ...params]
      .map(serialize)
      .filter((part) => part.length > 0)
      .join(' ');
  }
}
