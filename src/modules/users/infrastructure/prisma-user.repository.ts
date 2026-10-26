import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import type { UserRepository } from '../domain/user.repository';
import { User, UserDomainError, UserEmailConflictError, type UserRole } from '../domain/user';

function toDomainRole(role: string): UserRole {
  if (role === 'ADMIN') {
    return 'admin';
  }
  if (role === 'USER') {
    return 'user';
  }
  throw new UserDomainError(`Unknown role from storage: ${role}`);
}

function toDomainTheme(theme: string): 'light' | 'dark' {
  if (theme === 'light' || theme === 'dark') {
    return theme;
  }
  throw new UserDomainError(`Unknown theme from storage: ${theme}`);
}

function toDomainLanguage(language: string): 'en' | 'ru' {
  if (language === 'en' || language === 'ru') {
    return language;
  }
  throw new UserDomainError(`Unknown language from storage: ${language}`);
}

function toStorageTheme(theme: 'light' | 'dark'): 'light' | 'dark' {
  return theme;
}

function toStorageLanguage(language: 'en' | 'ru'): 'en' | 'ru' {
  return language;
}

function toStorageRole(role: UserRole): 'ADMIN' | 'USER' {
  return role === 'admin' ? 'ADMIN' : 'USER';
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

  async create(user: User): Promise<void> {
    try {
      await this.prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          role: toStorageRole(user.role),
          theme: toStorageTheme(user.theme as 'light' | 'dark'),
          language: toStorageLanguage(user.language as 'en' | 'ru'),
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      const errorWithCode = error as { code?: unknown; meta?: { target?: unknown } } | null;
      if (errorWithCode?.code === 'P2002') {
        const target = errorWithCode.meta?.target;
        if (
          !target ||
          (Array.isArray(target) ? target.includes('email') : String(target).includes('email'))
        ) {
          throw new UserEmailConflictError();
        }
      }
      throw error;
    }
  }

  async save(user: User): Promise<void> {
    try {
      await this.prisma.user.upsert({
        where: { email: user.email },
        create: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          role: toStorageRole(user.role),
          theme: toStorageTheme(user.theme as 'light' | 'dark'),
          language: toStorageLanguage(user.language as 'en' | 'ru'),
          createdAt: user.createdAt,
        },
        update: {
          passwordHash: user.passwordHash,
          role: toStorageRole(user.role),
          theme: toStorageTheme(user.theme as 'light' | 'dark'),
          language: toStorageLanguage(user.language as 'en' | 'ru'),
        },
      });
    } catch (error) {
      const errorWithCode = error as { code?: unknown; meta?: { target?: unknown } } | null;
      if (errorWithCode?.code === 'P2002') {
        const target = errorWithCode.meta?.target;
        if (
          !target ||
          (Array.isArray(target) ? target.includes('email') : String(target).includes('email'))
        ) {
          throw new UserEmailConflictError();
        }
      }
      throw error;
    }
  }

  private toDomain(row: {
    id: string;
    email: string;
    passwordHash: string;
    role: string;
    theme: string;
    language: string;
    createdAt: Date;
  }): User {
    return User.reconstitute({
      id: row.id,
      email: row.email,
      role: toDomainRole(row.role),
      passwordHash: row.passwordHash,
      theme: toDomainTheme(row.theme),
      language: toDomainLanguage(row.language),
      createdAt: row.createdAt,
    });
  }
}
