import { z } from 'zod';

/**
 * HTTP-boundary validation (defense in depth — domain invariants are NOT
 * replaced by these schemas, plan §3). `.strict()` rejects unknown fields,
 * so nothing can be smuggled past the use-case (mass assignment).
 */
export const loginSchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(1).max(1024),
    deviceId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .optional(),
  })
  .strict();

export type LoginBody = z.output<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(5).max(12),
    deviceId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .optional(),
  })
  .strict();

export type RegisterBody = z.output<typeof registerSchema>;
