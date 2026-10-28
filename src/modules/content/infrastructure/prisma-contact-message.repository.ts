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
    return this.mapRow(row);
  }

  async findById(id: string): Promise<ContactMessagePropsForRepo | null> {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    return row ? this.mapRow(row) : null;
  }

  async list(options?: {
    status?: string;
    skip?: number;
    take?: number;
  }): Promise<ContactMessagePropsForRepo[]> {
    const rows = await this.prisma.contactMessage.findMany({
      where: options?.status ? { status: options.status as 'NEW' | 'READ' | 'REPLIED' } : undefined,
      skip: options?.skip ?? 0,
      take: options?.take ?? 20,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async updateStatus(
    id: string,
    status: string,
    at?: Date,
  ): Promise<ContactMessagePropsForRepo | null> {
    const data: { status: 'NEW' | 'READ' | 'REPLIED'; readAt?: Date; repliedAt?: Date } = {
      status: status as 'NEW' | 'READ' | 'REPLIED',
    };
    if (status === 'READ') data.readAt = at ?? new Date();
    if (status === 'REPLIED') data.repliedAt = at ?? new Date();
    const row = await this.prisma.contactMessage.update({
      where: { id },
      data,
    });
    return this.mapRow(row);
  }

  private mapRow(row: {
    id: string;
    email: string;
    subject: string | null;
    body: string;
    source: string | null;
    locale: string | null;
    status: string;
    createdAt: Date;
    readAt: Date | null;
    repliedAt: Date | null;
  }): ContactMessagePropsForRepo {
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
