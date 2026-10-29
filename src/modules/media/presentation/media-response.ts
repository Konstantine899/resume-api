import { createHash } from 'node:crypto';

import type { Request, Response } from 'express';

import type { MediaObject } from '../domain/ports';

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

/**
 * Serves a media object with the headers fixed by plan D7: immutable cache,
 * strong ETag, nosniff, and a locked-down CSP for SVG.
 */
export function sendMedia(req: Request, res: Response, object: MediaObject): void {
  const etag = `"${createHash('sha1').update(object.data).digest('hex')}"`;

  const ifNoneMatch = req.headers['if-none-match'];
  const matches =
    typeof ifNoneMatch === 'string' &&
    ifNoneMatch
      .split(',')
      .map((value) => value.trim())
      .includes(etag);
  if (matches) {
    res.status(304).end();
    return;
  }

  res.setHeader('Cache-Control', IMMUTABLE_CACHE);
  res.setHeader('ETag', etag);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (object.mime === 'image/svg+xml') {
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  }
  res.type(object.mime).send(object.data);
}
