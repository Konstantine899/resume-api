import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;
const MIN_SECRET_ENTROPY_BITS = 3.0;

/**
 * Shannon entropy of a string, in bits per character:
 *   H = -Σ p(c) * log2(p(c)), where p(c) is the frequency of character c.
 *
 * Why an entropy check on top of a length check: a length-only rule accepts
 * predictable secrets like 32+ repeated characters ("aaaa...") or dictionary
 * phrases, which have low character diversity. A real random secret generated
 * with `openssl rand -base64 48` sits around 5 bits/char; anything below
 * 3.0 bits/char is overwhelmingly likely to be a hand-picked guessable string.
 * 3.0 is therefore a conservative floor: strict enough to catch predictable
 * values, loose enough to never reject genuine randomness.
 */
export function shannonEntropy(value: string): number {
  if (value.length === 0) {
    return 0;
  }
  const frequencies = new Map<string, number>();
  for (const char of value) {
    frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const probability = count / value.length;
    entropy -= probability * Math.log2(probability);
  }
  return entropy;
}

const secretSchema = z
  .string()
  .min(
    MIN_SECRET_LENGTH,
    `must be at least ${MIN_SECRET_LENGTH} characters long (generate with \`openssl rand -base64 48\`)`,
  )
  .refine((value) => shannonEntropy(value) >= MIN_SECRET_ENTROPY_BITS, {
    message: `must have Shannon entropy >= ${MIN_SECRET_ENTROPY_BITS} bits/char; this value looks repeated or hand-picked (generate with \`openssl rand -base64 48\`)`,
  });

const postgresUrlSchema = z
  .string()
  .refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'must be a postgresql:// URL',
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: postgresUrlSchema,
  JWT_ACCESS_SECRET: secretSchema,
  JWT_REFRESH_SECRET: secretSchema,
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates process environment (or a provided source) before the app boots.
 * Throws a single readable error listing every invalid variable, so a broken
 * deployment fails fast at startup instead of surfacing mid-request.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Environment validation failed:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
