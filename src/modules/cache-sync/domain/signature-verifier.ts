import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies an HMAC-SHA256 signature
 * @param payload The payload that was signed
 * @param signature The signature to verify (expected to be hex-encoded)
 * @param secretKey The secret key used to generate the signature
 * @returns True if the signature is valid, false otherwise
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secretKey: string,
): boolean {
  if (!payload || !signature || !secretKey) {
    return false;
  }

  // Calculate the expected signature
  const expectedSignature = createHmac('sha256', secretKey).update(payload).digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(Buffer.from(expectedSignature, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    // This can happen if the buffers are not valid hex strings
    return false;
  }
}

/**
 * Generates an HMAC-SHA256 signature for a payload
 * @param payload The payload to sign
 * @param secretKey The secret key to use for signing
 * @returns The hex-encoded HMAC-SHA256 signature
 */
export function generateHmacSignature(payload: string, secretKey: string): string {
  if (!payload || !secretKey) {
    throw new Error('Payload and secret key must be provided');
  }

  return createHmac('sha256', secretKey).update(payload).digest('hex');
}
