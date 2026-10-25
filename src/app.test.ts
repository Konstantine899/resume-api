import { describe, expect, it } from 'vitest';

import { APP_NAME, health } from './app';

describe('health', () => {
  it('reports ok for the package name', () => {
    expect(APP_NAME).toBe('resume-api');
    expect(health()).toEqual({ status: 'ok', app: APP_NAME });
  });
});
