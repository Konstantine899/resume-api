import { Controller, Get, HttpException, HttpStatus, Inject, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';

import { SafeSvg } from '../../content/domain/safe-svg';
import { detectMedia, mimeFor } from '../../media/domain/media-type';
const ASSET_KEY_RE = /^[a-z0-9][a-z0-9._/-]{0,200}$/;

function safeResolve(root: string, requested: string): string | null {
  if (requested === '' || requested.startsWith('/') || requested.includes('\0')) {
    return null;
  }
  const segments = requested.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    return null;
  }
  const full = path.resolve(root, ...segments);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  return full.startsWith(prefix) ? full : null;
}

@Controller('assets')
export class AssetsController {
  constructor(@Inject('SHARED_ASSETS_ROOT') private readonly root: string) {}

  @Get('*')
  async serve(@Req() req: Request, @Res() res: Response): Promise<void> {
    const raw = String(req.path ?? '').replace(/^\/assets\/?/, '');
    const relative = raw.replace(/^\/+/, '');
    if (relative === '' || !ASSET_KEY_RE.test(relative)) {
      throw new HttpException('not found', HttpStatus.NOT_FOUND);
    }
    const full = safeResolve(this.root, relative);
    if (!full) {
      throw new HttpException('not found', HttpStatus.NOT_FOUND);
    }

    const data = await fs.readFile(full).catch(() => null);
    if (!data) {
      throw new HttpException('not found', HttpStatus.NOT_FOUND);
    }
    const detected = detectMedia(data);
    if (!detected) {
      throw new HttpException('not found', HttpStatus.NOT_FOUND);
    }
    if (detected.kind === 'svg') {
      try {
        SafeSvg.of(data.toString('utf8'));
      } catch {
        throw new HttpException('not found', HttpStatus.NOT_FOUND);
      }
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (detected.kind === 'svg') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    }
    res.type(mimeFor(detected)).send(data);
  }
}
