import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';

import {
  MediaNotFoundError,
  MediaStorageAccessError,
  MediaStorageFullError,
} from '../domain/media-errors';
import type { MediaStorage } from '../domain/ports';

const TMP_PREFIX = '.tmp-';
const READY_PREFIX = '.ready-';
const FILE_MODE = 0o644;

function mapFsError(error: unknown): never {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === 'ENOSPC') {
    throw new MediaStorageFullError('media storage is full');
  }
  if (code === 'EACCES' || code === 'EPERM') {
    throw new MediaStorageAccessError('media storage is not writable');
  }
  throw error;
}

/**
 * Local-disk adapter (plan O1-A/D3): one replica, a persistent volume, flat
 * keys. Writes are atomic — a temp file in the same directory is renamed over
 * the final key, so a crash never leaves a half-written image under a live key.
 */
export class LocalDiskStorage implements MediaStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  async ensureReady(): Promise<void> {
    try {
      await fs.mkdir(this.root, { recursive: true });
    } catch (error) {
      mapFsError(error);
    }
  }

  async put(key: string, data: Buffer): Promise<void> {
    const target = this.resolve(key);
    const tmp = path.join(this.root, `${TMP_PREFIX}${randomUUID()}`);
    try {
      await fs.writeFile(tmp, data, { mode: FILE_MODE });
      await fs.rename(tmp, target);
    } catch (error) {
      await fs.rm(tmp, { force: true }).catch(() => undefined);
      mapFsError(error);
    }
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      mapFsError(error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      mapFsError(error);
    }
  }

  async writable(): Promise<boolean> {
    const probe = path.join(this.root, `${READY_PREFIX}${randomUUID()}`);
    try {
      await fs.writeFile(probe, 'ok', { mode: FILE_MODE });
      await fs.unlink(probe);
      return true;
    } catch {
      await fs.rm(probe, { force: true }).catch(() => undefined);
      return false;
    }
  }

  private resolve(key: string): string {
    const full = path.resolve(this.root, key);
    const prefix = this.root.endsWith(path.sep) ? this.root : `${this.root}${path.sep}`;
    // Defense in depth: keys are validated at the edge, but the adapter must
    // never be able to escape its root even if a caller forgets to.
    if (!full.startsWith(prefix)) {
      throw new MediaNotFoundError('media not found');
    }
    return full;
  }
}
