import { randomUUID } from 'node:crypto';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MediaNotFoundError } from '../domain/media-errors';
import { LocalDiskStorage } from './local-disk.storage';

let root: string;
let storage: LocalDiskStorage;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'resume-media-storage-'));
  storage = new LocalDiskStorage(root);
  await storage.ensureReady();
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('LocalDiskStorage (plan D3/WU-1)', () => {
  it('writes, reads and deletes bytes under a flat key', async () => {
    const key = `${randomUUID()}.webp`;
    await storage.put(key, Buffer.from('hello'));

    expect(await storage.read(key)).toEqual(Buffer.from('hello'));
    expect(await storage.writable()).toBe(true);

    await storage.delete(key);
    expect(await storage.read(key)).toBeNull();
    // Best-effort delete: a second call is a no-op.
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });

  it('leaves no temp files after a successful write', async () => {
    await storage.put(`${randomUUID()}.webp`, Buffer.from('x'));
    const entries = await readdir(root);
    expect(entries.filter((entry) => entry.startsWith('.tmp-'))).toEqual([]);
  });

  it('creates the root directory on demand', async () => {
    const nested = join(root, 'nested', 'deep');
    const nestedStorage = new LocalDiskStorage(nested);
    await nestedStorage.ensureReady();
    await nestedStorage.put('key.webp', Buffer.from('x'));
    expect(await nestedStorage.read('key.webp')).toEqual(Buffer.from('x'));
  });

  it('never escapes its root', async () => {
    await expect(storage.put('../escape.webp', Buffer.from('x'))).rejects.toBeInstanceOf(
      MediaNotFoundError,
    );
    await expect(storage.read('..\\escape.webp')).rejects.toBeInstanceOf(MediaNotFoundError);
  });

  it('reports readiness false when the root cannot be created', async () => {
    const impossible = new LocalDiskStorage(join(root, 'file-as-dir'));
    await storage.put('file-as-dir', Buffer.from('x'));

    await expect(impossible.ensureReady()).rejects.toBeTruthy();
    expect(await impossible.writable()).toBe(false);
  });
});
