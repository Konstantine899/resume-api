-- Migration: add Role.USER and default USER (pre-release, forward-only)
BEGIN;

CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN');

ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING ("role"::text::"Role_new");

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'USER';

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

COMMIT;
