import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
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
import { sendMedia } from './media-response';
import { MAX_UPLOAD_BYTES, readUploadedFile, type MulterRequest } from './upload-file';

/** Upload is admin-only and batched (icons); keep the global bucket, loosen the cap. */
const UPLOAD_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

function parseKind(value: unknown): MediaKind {
  if (value === 'portrait' || value === 'icon') {
    return value;
  }
  throw new BadRequestException('kind must be "portrait" or "icon"');
}

@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  @Throttle(UPLOAD_THROTTLE)
  @ApiOperation({ summary: 'Upload an image and return its immutable key + variants' })
  async upload(@Req() req: MulterRequest, @Query('kind') kind: unknown) {
    return this.media.upload(readUploadedFile(req), parseKind(kind));
  }

  @Get(':key')
  @ApiOperation({ summary: 'Serve a base image or one of its variants' })
  async serve(@Param('key') key: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const object = await this.media.get(key);
    sendMedia(req, res, object);
  }

  @Delete(':key')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete an unreferenced base image and its variants' })
  async remove(@Param('key') key: string): Promise<void> {
    await this.media.remove(key);
  }
}
