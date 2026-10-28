import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response, Request } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { SafeSvg } from '../domain/safe-svg';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|webp|svg)$/i;

function detect(buffer: Buffer): { ext: string; mime: string } | null {
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return { ext: '.png', mime: 'image/png' };
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return { ext: '.webp', mime: 'image/webp' };

  // JPEG is deliberately NOT accepted for avatars: reject its magic bytes
  // up front so it can never masquerade as something else.
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return null;
  }

  // SVG detection: authoritative SafeSvg validation.
  try {
    const text = buffer.toString('utf8');
    SafeSvg.of(text);
    return { ext: '.svg', mime: 'image/svg+xml' };
  } catch {
    return null;
  }
}

function uploadsRoot(): string {
  const root = process.env.UPLOADS_DIR ?? 'uploads';
  return path.resolve(root);
}

@Controller('images')
export class UploadController {
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(
    @Req() req: Request & { file?: { buffer?: Buffer; size?: number; mimetype?: string } },
  ): Promise<{ url: string; filename: string }> {
    const file = req.file;
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('missing file');
    if ((file.size ?? file.buffer.length) > MAX_BYTES)
      throw new PayloadTooLargeException('file too large');
    const info = detect(file.buffer);
    if (!info) throw new BadRequestException('unsupported image type');

    const name = randomUUID() + info.ext;
    const root = uploadsRoot();
    try {
      if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') throw new NotFoundException('root missing');
      if (code === 'EACCES' || code === 'EPERM') throw new ForbiddenException('permission denied');
      throw new InternalServerErrorException('write failed');
    }
    if (!fs.existsSync(root)) throw new NotFoundException('root missing');

    const target = path.join(root, name);
    const tmp = target + '.tmp-' + randomUUID();
    try {
      fs.writeFileSync(tmp, file.buffer);
      fs.renameSync(tmp, target);
    } catch (err) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        // best-effort cleanup
      }
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') throw new NotFoundException('root missing');
      if (code === 'EACCES' || code === 'EPERM') throw new ForbiddenException('permission denied');
      throw new InternalServerErrorException('write failed');
    }

    return { url: '/images/' + name, filename: name };
  }

  @Get(':name')
  serve(@Param('name') name: string, @Res() res: Response): void {
    if (!ALLOWED_NAME.test(name)) throw new NotFoundException('not found');
    const root = uploadsRoot();
    const full = path.join(root, name);
    if (!fs.existsSync(full)) throw new NotFoundException('not found');
    const info = detect(fs.readFileSync(full));
    if (!info) throw new NotFoundException('not found');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type(info.mime);
    res.sendFile(path.resolve(full));
  }

  @Delete(':name')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('name') name: string): Promise<{ ok: boolean }> {
    if (!ALLOWED_NAME.test(name)) throw new NotFoundException('not found');
    const root = uploadsRoot();
    const full = path.join(root, name);
    if (!fs.existsSync(full)) throw new NotFoundException('not found');
    try {
      fs.unlinkSync(full);
    } catch {
      throw new InternalServerErrorException('delete failed');
    }
    return { ok: true };
  }
}
