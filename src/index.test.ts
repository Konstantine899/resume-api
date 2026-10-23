import { describe, expect, it } from 'vitest';

import { APP_NAME } from './index';

describe('APP_NAME', () => {
  it('matches the package name', () => {
    expect(APP_NAME).toBe('resume-api');
  });
});
