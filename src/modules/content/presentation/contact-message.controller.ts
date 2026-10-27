import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  HttpException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { z } from 'zod';

import { CreateContactMessageUseCase } from '../application/use-cases';
import type { CreateContactMessageCommand } from '../application/commands';

const CONTACT_MESSAGE_THROTTLE = {
  default: {
    limit: 10,
    ttl: 60_000,
    getTracker: (req: unknown) => {
      const r = req as Request;
      const ip = r.ip ?? r.socket?.remoteAddress ?? 'unknown';
      const body = (r as { body?: unknown }).body as { email?: unknown } | undefined;
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      return `${ip}|${email}`;
    },
  },
} as const;

const contactMessageCreateSchema = z
  .object({
    email: z.string().trim().email().max(254),
    subject: z.string().trim().max(120).optional(),
    body: z.string().trim().min(1).max(2000),
    source: z.string().trim().max(64).optional(),
    locale: z.enum(['en', 'ru']).optional(),
    website: z.string().max(1000).optional(),
  })
  .strict();

function parseOrThrow(body: unknown): CreateContactMessageCommand & { website?: string } {
  const r = contactMessageCreateSchema.safeParse(body);
  if (!r.success) {
    throw new HttpException({ message: r.error.issues[0]?.message ?? 'invalid request body' }, 422);
  }
  const data = r.data as {
    email: string;
    subject?: string;
    body: string;
    source?: string;
    locale?: 'en' | 'ru';
    website?: string;
  };
  return {
    email: data.email,
    subject: data.subject,
    body: data.body,
    source: data.source,
    locale: data.locale,
    website: data.website,
  };
}

@Controller('contact')
export class ContactMessageController {
  private readonly emailBucket = new Map<string, number[]>();

  constructor(
    @Inject(CreateContactMessageUseCase)
    private readonly createMessage: CreateContactMessageUseCase,
  ) {}

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @Throttle(CONTACT_MESSAGE_THROTTLE)
  async create(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true })
    res: { status: (n: number) => void; set: (a: string, b: string) => void },
  ): Promise<{ id: string } | { accepted: boolean }> {
    const cmd = parseOrThrow(body);

    if (cmd.website && cmd.website.trim().length > 0) {
      res.status(202);
      return { accepted: true };
    }

    const normalizedEmail = cmd.email.trim().toLowerCase();
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const prior = this.emailBucket.get(normalizedEmail)?.filter((t) => now - t < hourMs) ?? [];
    if (prior.length >= 5) {
      const retryAfter = 3600 - Math.floor((now - (prior[0] ?? now)) / 1000);
      res.set('Retry-After', String(Math.max(1, retryAfter)));
      throw new HttpException({ message: 'too many requests for this email' }, 429);
    }
    prior.push(now);
    this.emailBucket.set(normalizedEmail, prior);

    const result = await this.createMessage.execute({
      email: cmd.email,
      subject: cmd.subject,
      body: cmd.body,
      source: cmd.source,
      locale: cmd.locale,
    });
    return result;
  }
}
