import { createHash, randomBytes } from 'node:crypto';

import type { RefreshTokenCodec } from '../domain/ports';

/**
 * Opaque refresh tokens: 32 random bytes (base64url) on the wire, SHA-256
 * hex in storage. The raw value exists only in the login/refresh response
 * and in the cookie (SPEC C14).
 */
export class OpaqueTokenCodec implements RefreshTokenCodec {
  create(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
