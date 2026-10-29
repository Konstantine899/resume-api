import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../../auth/presentation/jwt-auth.guard';
import { RolesGuard } from '../../content/presentation/roles.guard';
import { MediaService } from '../application/media.service';
import type { MediaKind } from '../domain/ports';
import { detectMedia } from '../domain/media-type';
import { UnsupportedMediaFormatError } from '../domain/media-errors';
import { sendMedia } from './media-response';
import { MAX_UPLOAD_BYTES, readUploadedFile, type MulterRequest } from './upload-file';

const UPLOAD_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

/**
 * Compatibility shim for the pre-pipeline frontend (plan D9). It keeps the
 * legacy `{ url, filename }` response and the `/images/*` routes while the
 * new `/media` contract rolls out; removed only after a 0-legacy report.
 */
@ApiTags('images')
@Controller('images')
export class ImagesCompatController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @Throttle(UPLOAD_THROTTLE)
  @ApiOperation({ summary: 'Legacy upload shape: { url, filename }' })
  async upload(@Req() req: MulterRequest): Promise<{ url: string; filename: string }> {
    const buffer = readUploadedFile(req);
    const detected = detectMedia(buffer);
    if (!detected) {
      throw new UnsupportedMediaFormatError('unsupported image type');
    }
    const kind: MediaKind = detected.kind === 'svg' ? 'icon' : 'portrait';
    const result = await this.media.upload(buffer, kind);
    return { url: `/images/${result.key}`, filename: result.key };
  }

  @Get(':key')
  async serve(@Param('key') key: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const object = await this.media.get(key);
    sendMedia(req, res, object);
  }

  @Delete(':key')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async remove(@Param('key') key: string): Promise<void> {
    await this.media.remove(key);
  }
}
