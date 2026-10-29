import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface MulterRequest extends Request {
  file?: { buffer?: Buffer; size?: number };
}

/** Extracts the multipart file or fails with the contract's 400. */
export function readUploadedFile(req: MulterRequest): Buffer {
  const file = req.file;
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new BadRequestException('missing file');
  }
  if ((file.size ?? file.buffer.length) > MAX_UPLOAD_BYTES) {
    throw new BadRequestException('file too large');
  }
  return file.buffer;
}
