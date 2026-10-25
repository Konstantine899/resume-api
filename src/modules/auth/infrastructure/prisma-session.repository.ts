import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { RevocationReason } from '../domain/events';
import type { SessionRepository } from '../domain/ports';
import { RefreshSession } from '../domain/refresh-session';
import { DeviceId } from '../domain/device-id';
import { TokenFamily } from '../domain/token-family';

interface SessionRow {
  id: string;
  familyId: string;
  userId: string;
  deviceId: string;
  tokenHash: string;
  status: 'active' | 'used' | 'revoked';
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
}

function hydrate(row: SessionRow): RefreshSession {
  return RefreshSession.reconstitute({
    id: row.id,
    familyId: TokenFamily.reconstitute(row.familyId),
    userId: row.userId,
    deviceId: DeviceId.create(row.deviceId),
    tokenHash: row.tokenHash,
    status: row.status,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    usedAt: row.usedAt,
    revokedAt: row.revokedAt,
    revokedReason: row.revokedReason as RevocationReason | null,
  });
}

/**
 * Prisma implementation of `SessionRepository` — the only code that touches
 * the `RefreshSession` table (plan §2: Prisma stays in infrastructure).
 */
@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<RefreshSession | null> {
    const row = await this.prisma.refreshSession.findUnique({ where: { tokenHash } });
    return row ? hydrate(row) : null;
  }

  async findFamily(familyId: string): Promise<RefreshSession[]> {
    const rows = await this.prisma.refreshSession.findMany({ where: { familyId } });
    return rows.map(hydrate);
  }

  async findActiveByDevice(userId: string, deviceId: string): Promise<RefreshSession[]> {
    const rows = await this.prisma.refreshSession.findMany({
      where: { userId, deviceId, status: 'active' },
    });
    return rows.map(hydrate);
  }

  async save(session: RefreshSession): Promise<void> {
    await this.prisma.refreshSession.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        familyId: session.familyId.value,
        userId: session.userId,
        deviceId: session.deviceId.value,
        tokenHash: session.tokenHash,
        status: session.status,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        usedAt: session.usedAt,
        revokedAt: session.revokedAt,
        revokedReason: session.revokedReason,
      },
      update: {
        status: session.status,
        usedAt: session.usedAt,
        revokedAt: session.revokedAt,
        revokedReason: session.revokedReason,
      },
    });
  }

  async saveAll(sessions: RefreshSession[]): Promise<void> {
    await Promise.all(sessions.map((session) => this.save(session)));
  }

  async markActiveUsed(id: string, now: Date): Promise<boolean> {
    const result = await this.prisma.refreshSession.updateMany({
      where: { id, status: 'active' },
      data: { status: 'used', usedAt: now },
    });
    return result.count > 0;
  }
}
