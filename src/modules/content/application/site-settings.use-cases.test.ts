import { describe, expect, it, vi } from 'vitest';

import { GetSiteSettingsUseCase, UpsertSiteSettingsUseCase } from './use-cases';
import type { SiteSettingsRepository } from '../domain/ports';
import type { SiteSettings } from '../domain/aggregates';

describe('SiteSettings use cases', () => {
  it('GetSiteSettings UseCase returns null when no record exists', async () => {
    const repository: SiteSettingsRepository = {
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const uc = new GetSiteSettingsUseCase(repository);
    await expect(uc.execute()).resolves.toBeNull();
  });

  it('UpsertSiteSettings creates a new record when empty', async () => {
    const repository: SiteSettingsRepository = {
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const uc = new UpsertSiteSettingsUseCase(repository);
    const result = await uc.execute({ resumeUrl: 'https://example.com/resume.pdf' });
    expect(result.resumeUrl).toBe('https://example.com/resume.pdf');
    expect(repository.save).toHaveBeenCalledOnce();
  });

  it('UpsertSiteSettings updates an existing record', async () => {
    const mut = {
      resumeUrl: 'https://example.com/old.pdf' as string | null,
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    };
    const existing = {
      toProps: () => ({
        id: 'singleton',
        resumeUrl: mut.resumeUrl,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: mut.updatedAt,
      }),
      id: 'singleton',
      get resumeUrl() {
        return mut.resumeUrl;
      },
      createdAt: new Date('2025-01-01T00:00:00Z'),
      get updatedAt() {
        return mut.updatedAt;
      },
      update: (input: { resumeUrl?: string | null }) => {
        if (input.resumeUrl !== undefined) mut.resumeUrl = input.resumeUrl ?? null;
        mut.updatedAt = new Date();
      },
    } as unknown as SiteSettings;
    const repository: SiteSettingsRepository = {
      get: vi.fn().mockResolvedValue(existing),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const uc = new UpsertSiteSettingsUseCase(repository);
    const result = await uc.execute({ resumeUrl: null });
    expect(result.resumeUrl).toBeNull();
    expect(repository.save).toHaveBeenCalledOnce();
  });
});
