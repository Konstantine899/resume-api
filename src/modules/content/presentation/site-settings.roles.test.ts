import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import { RolesGuard } from './roles.guard';

describe('SiteSettings RolesGuard', () => {
  it('rejects non-admin roles with 403', () => {
    const guard = new RolesGuard();
    const request = { user: { role: 'user' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows admin role', () => {
    const guard = new RolesGuard();
    const request = { user: { role: 'admin' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
