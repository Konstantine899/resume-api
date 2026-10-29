export const MEDIA_CONFIG = Symbol('MEDIA_CONFIG');
export const MEDIA_STORAGE = Symbol('MEDIA_STORAGE');
export const MEDIA_PROCESSOR = Symbol('MEDIA_PROCESSOR');
export const MEDIA_REFERENCES = Symbol('MEDIA_REFERENCES');

export interface MediaConfig {
  uploadsDir: string;
}
