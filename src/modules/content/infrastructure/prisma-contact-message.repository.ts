import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { ContactMessageRepository, ContactMessagePropsForRepo } from '../domain/ports';

@Injectable()
export class PrismaContactMessageRepository implements ContactMessageRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(entity: ContactMessagePropsForRepo): Promise<ContactMessagePropsForRepo> {
    const row = await this.prisma.contactMessage.create({
      data: {
        id: entity.id,
        email: entity.email,
        subject: entity.subject ?? null,
        body: entity.body,
        source: entity.source ?? null,
        locale: entity.locale ?? null,
        status: entity.status as 'NEW' | 'READ' | 'REPLIED',
      },
    });
    return {
      id: row.id,
      email: row.email,
      subject: row.subject ?? undefined,
      body: row.body,
      source: row.source ?? undefined,
      locale: row.locale ?? undefined,
      status: row.status,
      createdAt: row.createdAt,
      readAt: row.readAt ?? undefined,
      repliedAt: row.repliedAt ?? undefined,
    };
  }
}
