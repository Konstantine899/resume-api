import type { User } from './user';

/**
 * Storage port of the users context. The Prisma implementation lives in
 * `infrastructure/`; nothing outside `infrastructure/` may import Prisma.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Upsert keyed by the unique email. */
  save(user: User): Promise<void>;
  /** Insert a new row; surfaces unique-violation as `PrismaClientKnownRequestError`. */
  create?(user: User): Promise<void>;
}
