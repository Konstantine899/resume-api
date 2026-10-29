import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException } from '@nestjs/common';
import type { Response, Request } from 'express';

@Catch()
export class Rfc7807ExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred.';
    let type = 'about:blank';
    let conflicts: unknown;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      if (typeof r === 'string') {
        detail = r;
        title = r;
      } else if (r && typeof r === 'object') {
        const obj = r as Record<string, unknown>;
        if (typeof obj.message === 'string') detail = obj.message;
        if (Array.isArray(obj.message)) detail = (obj.message as string[]).join('; ');
        if (typeof obj.error === 'string') title = obj.error;
        if (typeof obj.tag === 'string') type = 'urn:resume-api:' + obj.tag;
      }
    } else if (exception && typeof exception === 'object') {
      const ex = exception as { name?: string; message?: string };
      const name = ex.name ?? '';
      const message = ex.message;
      const map = (s: number, t: string, d: string): void => {
        status = s;
        title = t;
        detail = d;
      };
      if (name === 'ContentNotFoundError' || name.endsWith('NotFoundError')) {
        map(HttpStatus.NOT_FOUND, 'Not Found', message ?? 'resource not found');
      } else if (name === 'AboutConflictError') {
        map(HttpStatus.CONFLICT, 'Conflict', message ?? 'conflict');
        conflicts = (exception as { conflicts?: unknown }).conflicts;
      } else if (name === 'ContentConflictError' || name.endsWith('ConflictError')) {
        map(HttpStatus.CONFLICT, 'Conflict', message ?? 'conflict');
      } else if (name === 'UnsupportedMediaFormatError') {
        map(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          'Unsupported Media Type',
          message ?? 'unsupported media type',
        );
      } else if (name === 'MediaStorageFullError') {
        map(
          HttpStatus.INSUFFICIENT_STORAGE,
          'Insufficient Storage',
          message ?? 'media storage is full',
        );
      } else if (name === 'MediaStorageAccessError') {
        map(HttpStatus.FORBIDDEN, 'Forbidden', message ?? 'media storage is not writable');
      } else if (name === 'ContentValidationError' || name.endsWith('ValidationError')) {
        map(HttpStatus.UNPROCESSABLE_ENTITY, 'Validation Error', message ?? 'invalid input');
      } else if (name === 'ContentDomainError' || name.endsWith('DomainError')) {
        map(HttpStatus.BAD_REQUEST, 'Domain Error', message ?? 'invalid input');
      }
    }
    if (status >= 500 && status !== HttpStatus.INSUFFICIENT_STORAGE) {
      detail = 'Internal server error.';
      title = 'Internal Server Error';
    }
    res
      .status(status)
      .type('application/problem+json')
      .json({
        type,
        title,
        status,
        detail,
        instance: (req.originalUrl ?? req.url ?? '/').split('?')[0] || '/',
        ...(conflicts !== undefined ? { conflicts } : {}),
      });
  }
}
