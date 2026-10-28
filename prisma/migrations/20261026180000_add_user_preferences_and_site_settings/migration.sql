-- Migration: user preferences (theme, language) and site settings (resume URL).
BEGIN;

CREATE TYPE "UserTheme" AS ENUM ('light', 'dark');

CREATE TYPE "UserLanguage" AS ENUM ('en', 'ru');

ALTER TABLE "User"
  ADD COLUMN "language" "UserLanguage" NOT NULL DEFAULT 'ru',
  ADD COLUMN "theme" "UserTheme" NOT NULL DEFAULT 'dark';

CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "resumeUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

COMMIT;
