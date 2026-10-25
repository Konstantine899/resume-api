import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
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

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|gif|webp)$/i;

function detect(buffer: Buffer): { ext: string; mime: string } | null {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
    return { ext: '.png', mime: 'image/png' };
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
    return { ext: '.jpg', mime: 'image/jpeg' };
  if (
    buffer.subarray(0, 6).toString('latin1').startsWith('GIF87a') ||
    buffer.subarray(0, 6).toString('latin1').startsWith('GIF89a')
  )
    return { ext: '.gif', mime: 'image/gif' };
  if (
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  )
    return { ext: '.webp', mime: 'image/webp' };
  return null;
}

@Controller('images')
export class UploadController {
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(
    @Req() req: Request & { file?: { buffer?: Buffer; size?: number } },
  ): Promise<{ url: string; filename: string }> {
    const file = req.file;
    if (!file || !Buffer.isBuffer(file.buffer)) throw new BadRequestException('missing file');
    if ((file.size ?? file.buffer.length) > MAX_BYTES)
      throw new BadRequestException('file too large');
    const info = detect(file.buffer);
    if (!info) throw new BadRequestException('unsupported image type');
    const name = randomUUID() + info.ext;
    const root = process.env.UPLOADS_DIR ?? 'uploads';
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });
    fs.writeFileSync(path.join(root, name), file.buffer);
    return { url: '/images/' + name, filename: name };
  }

  @Get(':name')
  serve(@Param('name') name: string, @Res() res: Response): void {
    if (!ALLOWED_NAME.test(name)) throw new NotFoundException('not found');
    const root = process.env.UPLOADS_DIR ?? 'uploads';
    const full = path.join(root, name);
    if (!fs.existsSync(full)) throw new NotFoundException('not found');
    const info = detect(fs.readFileSync(full));
    if (!info) throw new NotFoundException('not found');
    res.type(info.mime);
    res.sendFile(path.resolve(full));
  }
}
