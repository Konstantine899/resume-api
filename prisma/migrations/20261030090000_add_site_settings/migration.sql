-- Migration: add site settings singleton.
-- Idempotent form keeps fresh-DB bootstrap and existing dev installs working.

CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" TEXT NOT NULL DEFAULT 'singleton',
  "resumeUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SiteSettings"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;