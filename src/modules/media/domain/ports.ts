// Ports of the media context (plan D3/D4). Domain and application layers do
// not know where bytes live or which image library encodes them.

export type MediaKind = 'portrait' | 'icon';

export interface MediaVariant {
  width: number;
  key: string;
}

export interface MediaFile {
  key: string;
  data: Buffer;
}

export interface ProcessedMedia {
  /** Base key — the value a document stores. */
  key: string;
  width: number;
  height: number;
  variants: MediaVariant[];
  /** Every file that must be persisted: the base plus its variants. */
  files: MediaFile[];
}

export interface MediaObject {
  data: Buffer;
  mime: string;
}

export interface MediaProcessor {
  process(input: Buffer, kind: MediaKind): Promise<ProcessedMedia>;
}

export interface MediaStorage {
  /** Creates the root directory; called once while the app boots. */
  ensureReady(): Promise<void>;
  put(key: string, data: Buffer): Promise<void>;
  /** Returns `null` when the key does not exist. */
  read(key: string): Promise<Buffer | null>;
  /** Best-effort delete: a missing key is not an error. */
  delete(key: string): Promise<void>;
  /** Proves the root accepts a write (readiness probe). */
  writable(): Promise<boolean>;
}

/** Answers “is this key still referenced by a document?” (DELETE guard). */
export interface MediaReferences {
  isReferenced(key: string): Promise<boolean>;
}
