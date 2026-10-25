-- CreateTable
CREATE TABLE "AboutContent" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "fullName" TEXT NOT NULL,
    "descriptions" JSONB NOT NULL,
    "stats" JSONB NOT NULL,
    "statLabels" JSONB,
    "ctaLabel" JSONB,
    "portrait" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactContent" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "email" TEXT NOT NULL,
    "texts" JSONB NOT NULL,
    "formTexts" JSONB NOT NULL,
    "socialLinks" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" JSONB NOT NULL,
    "techIcons" JSONB NOT NULL,
    "link" TEXT,
    "image" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "status" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "role" JSONB,
    "metrics" JSONB,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "technologies" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" JSONB NOT NULL,
    "technologies" JSONB NOT NULL,
    "location" TEXT NOT NULL,
    "current" BOOLEAN NOT NULL DEFAULT false,
    "employmentType" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "companyUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Technology" (
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "invertInDark" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Technology_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AboutContent_updatedAt_idx" ON "AboutContent"("updatedAt");

-- CreateIndex
CREATE INDEX "ContactContent_updatedAt_idx" ON "ContactContent"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_featured_idx" ON "Project"("featured");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_category_key" ON "SkillCategory"("category");

-- CreateIndex
CREATE INDEX "SkillCategory_updatedAt_idx" ON "SkillCategory"("updatedAt");

-- CreateIndex
CREATE INDEX "Job_current_idx" ON "Job"("current");

-- CreateIndex
CREATE INDEX "Job_startDate_idx" ON "Job"("startDate");

-- CreateIndex
CREATE INDEX "Job_featured_idx" ON "Job"("featured");

-- CreateIndex
CREATE INDEX "Job_updatedAt_idx" ON "Job"("updatedAt");

-- CreateIndex
CREATE INDEX "Technology_updatedAt_idx" ON "Technology"("updatedAt");
