import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { UserRepository } from '../domain/user.repository';
import { User, UserDomainError, type UserRole } from '../domain/user';

function toDomainRole(role: string): UserRole {
  if (role === 'ADMIN') {
    return 'admin';
  }
  throw new UserDomainError(`Unknown role from storage: ${role}`);
}

/**
 * Prisma implementation of `UserRepository` — the ONLY place where the
 * `User` table is touched (plan §2: Prisma stays inside infrastructure).
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.upsert({
      where: { email: user.email },
      create: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        role: 'ADMIN',
        createdAt: user.createdAt,
      },
      update: {
        passwordHash: user.passwordHash,
        role: 'ADMIN',
      },
    });
  }

  private toDomain(row: {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    createdAt: Date;
  }): User {
    return User.reconstitute({
      id: row.id,
      email: row.email,
      role: toDomainRole(row.role),
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
    });
  }
}
