import { describe, expect, it, vi } from 'vitest';

import { MediaConflictError, MediaNotFoundError } from '../domain/media-errors';
import type {
  MediaObject,
  MediaProcessor,
  MediaReferences,
  MediaStorage,
  ProcessedMedia,
} from '../domain/ports';
import { MediaService } from './media.service';

const UUID = '2f1c9a7e-4b3d-4c8f-9a1b-7d6e5f4a3b2c';

function processed(): ProcessedMedia {
  return {
    key: `${UUID}.webp`,
    width: 1200,
    height: 900,
    variants: [
      { width: 320, key: `${UUID}-320.webp` },
      { width: 640, key: `${UUID}-640.webp` },
      { width: 960, key: `${UUID}-960.webp` },
    ],
    files: [
      { key: `${UUID}.webp`, data: Buffer.from('base') },
      { key: `${UUID}-320.webp`, data: Buffer.from('320') },
      { key: `${UUID}-640.webp`, data: Buffer.from('640') },
      { key: `${UUID}-960.webp`, data: Buffer.from('960') },
    ],
  };
}

class FakeStorage implements MediaStorage {
  readonly objects = new Map<string, Buffer>();
  readonly deleted: string[] = [];
  failOnPut?: string;

  async ensureReady(): Promise<void> {}
  async put(key: string, data: Buffer): Promise<void> {
    if (this.failOnPut === key) {
      throw new Error('disk full');
    }
    this.objects.set(key, data);
  }
  async read(key: string): Promise<Buffer | null> {
    return this.objects.get(key) ?? null;
  }
  async delete(key: string): Promise<void> {
    this.deleted.push(key);
    this.objects.delete(key);
  }
  async writable(): Promise<boolean> {
    return true;
  }
}

describe('MediaService', () => {
  it('persists the base and every variant, and returns the public shape', async () => {
    const storage = new FakeStorage();
    const processor: MediaProcessor = { process: vi.fn(async () => processed()) };
    const references: MediaReferences = { isReferenced: vi.fn(async () => false) };
    const service = new MediaService(processor, storage, references);

    const result = await service.upload(Buffer.from('input'), 'portrait');

    expect(result).toEqual({
      key: `${UUID}.webp`,
      width: 1200,
      height: 900,
      variants: processed().variants,
    });
    expect([...storage.objects.keys()].sort()).toEqual(
      [`${UUID}.webp`, `${UUID}-320.webp`, `${UUID}-640.webp`, `${UUID}-960.webp`].sort(),
    );
  });

  it('deletes already written files when a later write fails', async () => {
    const storage = new FakeStorage();
    storage.failOnPut = `${UUID}-640.webp`;
    const processor: MediaProcessor = { process: vi.fn(async () => processed()) };
    const references: MediaReferences = { isReferenced: vi.fn(async () => false) };
    const service = new MediaService(processor, storage, references);

    await expect(service.upload(Buffer.from('input'), 'portrait')).rejects.toThrow('disk full');
    expect(storage.objects.size).toBe(0);
    expect(storage.deleted).toEqual([`${UUID}.webp`, `${UUID}-320.webp`]);
  });

  it('serves base and variant content, and maps missing/unknown content to 404', async () => {
    const storage = new FakeStorage();
    storage.objects.set(
      `${UUID}.webp`,
      Buffer.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    );
    const service = new MediaService({ process: vi.fn() }, storage, {
      isReferenced: vi.fn(async () => false),
    });

    const object: MediaObject = await service.get(`${UUID}.webp`);
    expect(object.mime).toBe('image/webp');

    await expect(service.get('../etc/passwd')).rejects.toBeInstanceOf(MediaNotFoundError);
    await expect(service.get(`${UUID}-320.webp`)).rejects.toBeInstanceOf(MediaNotFoundError);

    storage.objects.set(`${UUID}-320.webp`, Buffer.from('not an image'));
    await expect(service.get(`${UUID}-320.webp`)).rejects.toBeInstanceOf(MediaNotFoundError);
  });

  it('refuses to delete a key that a document still references', async () => {
    const storage = new FakeStorage();
    const references: MediaReferences = { isReferenced: vi.fn(async () => true) };
    const service = new MediaService({ process: vi.fn() }, storage, references);

    await expect(service.remove(`${UUID}.webp`)).rejects.toBeInstanceOf(MediaConflictError);
    expect(storage.deleted).toEqual([]);
  });

  it('deletes a base key together with its variants', async () => {
    const storage = new FakeStorage();
    const service = new MediaService({ process: vi.fn() }, storage, {
      isReferenced: vi.fn(async () => false),
    });

    await service.remove(`${UUID}.webp`);
    expect(storage.deleted).toEqual([
      `${UUID}.webp`,
      `${UUID}-320.webp`,
      `${UUID}-640.webp`,
      `${UUID}-960.webp`,
    ]);
  });

  it('does not accept a variant key as a delete target', async () => {
    const service = new MediaService({ process: vi.fn() }, new FakeStorage(), {
      isReferenced: vi.fn(async () => false),
    });
    await expect(service.remove(`${UUID}-320.webp`)).rejects.toBeInstanceOf(MediaNotFoundError);
  });
});
