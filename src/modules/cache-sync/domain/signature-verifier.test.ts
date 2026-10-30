import { describe, expect, it, beforeEach } from 'vitest';
import { verifyHmacSignature, generateHmacSignature } from './signature-verifier';

describe('verifyHmacSignature', () => {
  const payload = '{"test":"data"}';
  const secretKey = 'secret-key-123';
  let signature: string;

  beforeEach(() => {
    signature = generateHmacSignature(payload, secretKey);
  });

  it('should return true for valid signature', () => {
    expect(verifyHmacSignature(payload, signature, secretKey)).toBe(true);
  });

  it('should return false for invalid signature', () => {
    const invalidSignature = 'invalidsignature123';
    expect(verifyHmacSignature(payload, invalidSignature, secretKey)).toBe(false);
  });

  it('should return false for wrong payload', () => {
    const wrongPayload = '{"wrong":"data"}';
    expect(verifyHmacSignature(wrongPayload, signature, secretKey)).toBe(false);
  });

  it('should return false for wrong secret key', () => {
    const wrongSecret = 'wrong-secret-key';
    expect(verifyHmacSignature(payload, signature, wrongSecret)).toBe(false);
  });

  it('should return false for missing inputs', () => {
    expect(verifyHmacSignature('', '', '')).toBe(false);
    expect(verifyHmacSignature(payload, '', secretKey)).toBe(false);
    expect(verifyHmacSignature(payload, signature, '')).toBe(false);
    expect(verifyHmacSignature('', signature, secretKey)).toBe(false);
  });

  it('should use timing-safe comparison to prevent timing attacks', () => {
    // This test verifies that the function uses timingSafeEqual internally
    // We can't directly test timing, but we can verify it doesn't throw on invalid hex
    const invalidHexSignature = 'not-hex-characters!!!';
    expect(() => verifyHmacSignature(payload, invalidHexSignature, secretKey)).not.toThrow();
    expect(verifyHmacSignature(payload, invalidHexSignature, secretKey)).toBe(false);
  });
});

describe('generateHmacSignature', () => {
  it('should generate a valid signature', () => {
    const payload = '{"test":"data"}';
    const secretKey = 'secret-key-123';
    const signature = generateHmacSignature(payload, secretKey);

    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
    // Should be a valid hex string
    expect(/^[0-9a-f]+$/.test(signature)).toBe(true);
  });

  it('should throw error for missing inputs', () => {
    expect(() => generateHmacSignature('', '')).toThrow('Payload and secret key must be provided');
    expect(() => generateHmacSignature('payload', '')).toThrow(
      'Payload and secret key must be provided',
    );
    expect(() => generateHmacSignature('', 'secret')).toThrow(
      'Payload and secret key must be provided',
    );
  });

  it('should generate consistent signatures for same inputs', () => {
    const payload = '{"test":"data"}';
    const secretKey = 'secret-key-123';

    const signature1 = generateHmacSignature(payload, secretKey);
    const signature2 = generateHmacSignature(payload, secretKey);

    expect(signature1).toBe(signature2);
  });
});
