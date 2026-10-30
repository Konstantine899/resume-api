import { describe, expect, it } from 'vitest';

import { SiteSettingsController } from './site-settings.controller';
import type { GetSiteSettingsUseCase, UpsertSiteSettingsUseCase } from '../application/use-cases';

describe('SiteSettingsController', () => {
  it('GET returns null resumeUrl when missing', async () => {
    const get = { execute: async () => null } as unknown as GetSiteSettingsUseCase;
    const upsert = {
      execute: async () => ({ resumeUrl: null }),
    } as unknown as UpsertSiteSettingsUseCase;
    const ctrl = new SiteSettingsController(get, upsert);
    await expect(ctrl.get()).resolves.toEqual({ resumeUrl: null });
  });

  it('GET returns value', async () => {
    const get = {
      execute: async () => ({ resumeUrl: 'https://example.com/resume.pdf' }),
    } as unknown as GetSiteSettingsUseCase;
    const upsert = {
      execute: async () => ({ resumeUrl: null }),
    } as unknown as UpsertSiteSettingsUseCase;
    const ctrl = new SiteSettingsController(get, upsert);
    await expect(ctrl.get()).resolves.toEqual({ resumeUrl: 'https://example.com/resume.pdf' });
  });

  it('PUT invalid payload rejects', async () => {
    const get = { execute: async () => null } as unknown as GetSiteSettingsUseCase;
    const upsert = {
      execute: async () => ({ resumeUrl: null }),
    } as unknown as UpsertSiteSettingsUseCase;
    const ctrl = new SiteSettingsController(get, upsert);
    await expect(ctrl.update({ resumeUrl: 'not-a-url' })).rejects.toBeTruthy();
  });

  it('PUT null calls use case and returns null', async () => {
    const upsert = {
      execute: async (cmd: { resumeUrl: string | null }) => ({ resumeUrl: cmd.resumeUrl }),
    } as unknown as UpsertSiteSettingsUseCase;
    const ctrl = new SiteSettingsController(
      { execute: async () => null } as unknown as GetSiteSettingsUseCase,
      upsert,
    );
    await expect(ctrl.update({ resumeUrl: null })).resolves.toEqual({ resumeUrl: null });
  });
});
