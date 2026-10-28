import 'dotenv/config';
import * as path from 'node:path';

import { z } from 'zod';

/** Minimum entropy for JWT_SECRET, measured in UTF-8 bytes. */
const MIN_JWT_SECRET_BYTES = 32;

const POSTGRES_URL_PATTERN = /^postgres(ql)?:\/\/\S+$/;

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

/**
 * Normalizes a loose boolean flag into the enum the schema accepts, so a typo
 * still fails validation instead of silently disabling the feature.
 */
function normalizeBooleanFlag(value: string | undefined, defaultValue = 'false'): string {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) {
    return 'true';
  }
  if (FALSE_VALUES.has(normalized)) {
    return 'false';
  }
  return normalized;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL must not be empty')
    .refine((value) => POSTGRES_URL_PATTERN.test(value), {
      message: 'DATABASE_URL must be a postgresql:// connection string',
    }),
  JWT_SECRET: z.string().superRefine((value, ctx) => {
    const bytes = Buffer.byteLength(value, 'utf8');
    if (bytes < MIN_JWT_SECRET_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message:
          `JWT_SECRET must be at least ${MIN_JWT_SECRET_BYTES} bytes (got ${bytes}). ` +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
      });
    }
  }),
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  // Admin seed (`npm run seed:admin`): the only admin provisioning path.
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must be at least 12 characters'),
  ALLOW_PUBLIC_REGISTRATION: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  // CORS allowlist: exactly the frontend origin, with credentials.
  FRONTEND_ORIGIN: z.url().default('http://localhost:5173'),
  // Absolute persistent uploads directory for POST /images.
  UPLOADS_DIR: z.string().min(1).default('uploads'),
  // Refresh-cookie Path. '/auth' covers /auth/refresh + /auth/logout; behind
  // the vite '/api' proxy set '/api/auth' — the browser matches the cookie
  // path against the URL it requested, before proxying.
  COOKIE_PATH: z.string().startsWith('/', 'COOKIE_PATH must start with "/"').default('/auth'),
});

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(
      ['Invalid environment configuration:', ...issues.map((issue) => `  - ${issue}`)].join('\n'),
    );
    this.name = 'EnvValidationError';
  }
}

/**
 * Pure validation: parses and checks the given environment source.
 * Throws `EnvValidationError` — no side effects, so it is unit-testable.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const normalized: NodeJS.ProcessEnv = {
    ...source,
    SWAGGER_ENABLED: normalizeBooleanFlag(source.SWAGGER_ENABLED),
    ALLOW_PUBLIC_REGISTRATION: normalizeBooleanFlag(source.ALLOW_PUBLIC_REGISTRATION, 'true'),
  };

  const result = envSchema.safeParse(normalized);
  if (result.success) {
    const nodeEnv = result.data.NODE_ENV;
    const uploadsDir = result.data.UPLOADS_DIR;
    if (nodeEnv === 'production' && !path.isAbsolute(uploadsDir)) {
      throw new EnvValidationError(['UPLOADS_DIR: must be an absolute path in production']);
    }
  }
  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`,
    );
    throw new EnvValidationError(issues);
  }

  return result.data;
}

/**
 * Startup gate: invalid configuration must crash the process instead of
 * letting the app run with a weak secret or an unusable database URL.
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  try {
    return parseEnv(source);
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`\n[resume-api] Refusing to start.\n${error.message}\n`);
    } else {
      console.error('\n[resume-api] Refusing to start: environment check failed.', error);
    }
    process.exit(1);
  }
}
