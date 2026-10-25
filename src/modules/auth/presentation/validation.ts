import { BadRequestException } from '@nestjs/common';
import type { ZodType, z } from 'zod';

/** Parses and validates a request body; failures become a generic 400. */
export function parseBody<S extends ZodType>(schema: S, body: unknown): z.output<S> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      details: result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`,
      ),
    });
  }
  return result.data;
}
