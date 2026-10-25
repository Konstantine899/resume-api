import { describe, expect, it } from 'vitest';

import { ACCESS_TOKEN_TTL_SECONDS } from '../domain/constants';
import { JwtAccessTokenIssuer } from './jwt-access-token-issuer';

describe('access-token issuer (SPEC C1/C16)', () => {
  const issuer = new JwtAccessTokenIssuer('unit-test-secret-that-is-long-enough-0123456789');

  it('signs a 15-minute access token with sub/role/typ claims', () => {
    const token = issuer.sign({ sub: 'user-1', role: 'admin' });
    const claims = issuer.verify(token);

    expect(claims.sub).toBe('user-1');
    expect(claims.role).toBe('admin');
    expect(claims.typ).toBe('access');
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(900);
  });

  it('rejects a token signed with another secret', () => {
    const other = new JwtAccessTokenIssuer('different-secret-that-is-also-long-enough-012345');
    const token = other.sign({ sub: 'user-1', role: 'admin' });

    expect(() => issuer.verify(token)).toThrow();
  });

  it('rejects a tampered token', () => {
    const token = issuer.sign({ sub: 'user-1', role: 'admin' });
    const [header, payload, signature] = token.split('.');
    const forged = `${header}.${Buffer.from(
      JSON.stringify({ sub: 'user-2', role: 'admin', typ: 'access' }),
    ).toString('base64url')}.${signature}`;

    expect(forged).not.toBe(token);
    expect(payload).not.toBe('');
    expect(() => issuer.verify(forged)).toThrow();
  });
});
