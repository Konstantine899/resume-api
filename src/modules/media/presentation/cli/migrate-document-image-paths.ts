import 'dotenv/config';

import { parseEnv } from '../../../../config/env';
import { PrismaService } from '../../../../prisma/prisma.service';
import { isMediaKey, parseMediaKey } from '../../domain/media-key';

parseEnv();
const apply = process.argv.includes('--apply');
const prisma = new PrismaService();

function extractMediaKey(value: unknown): unknown {
  if (typeof value !== 'string' || value.trim() === '') {
    return value;
  }
  let candidate = value.trim();
  if (/^https?:\/\//i.test(candidate)) {
    try {
      candidate = new URL(candidate).pathname || candidate;
    } catch {
      // Fall back to the raw value if it is not a valid URL.
    }
  }
  const segments = candidate.split('/').filter(Boolean);
  candidate = segments.at(-1) ?? candidate;

  const parsed = parseMediaKey(candidate);
  if (!parsed) {
    return value;
  }
  if (parsed.variantWidth !== null) {
    return `${parsed.uuid}.${parsed.extension}`;
  }
  if (!isMediaKey(candidate)) {
    return value;
  }
  return candidate;
}

async function migrateAbout(): Promise<number> {
  const rows = await prisma.aboutContent.findMany();
  let changed = 0;
  for (const row of rows) {
    const next = extractMediaKey(row.portrait);
    if (next === row.portrait) {
      continue;
    }
    changed += 1;
    const line = `[about:${row.id}] portrait ${String(row.portrait)} -> ${String(next)}`;
    if (apply) {
      await prisma.aboutContent.update({
        where: { id: row.id },
        data: { portrait: next ?? null },
      });
      console.log(`[applied] ${line}`);
    } else {
      console.log(`[dry-run] ${line}`);
    }
  }
  return changed;
}

async function migrateProjects(): Promise<number> {
  const rows = await prisma.project.findMany();
  let changed = 0;
  for (const row of rows) {
    const next = extractMediaKey(row.image);
    if (next === row.image) {
      continue;
    }
    changed += 1;
    const line = `[project:${row.id}] image ${String(row.image)} -> ${String(next)}`;
    if (apply) {
      await prisma.project.update({
        where: { id: row.id },
        data: { image: next as string },
      });
      console.log(`[applied] ${line}`);
    } else {
      console.log(`[dry-run] ${line}`);
    }
  }
  return changed;
}

async function migrateTechnologies(): Promise<number> {
  const rows = await prisma.technology.findMany();
  let changed = 0;
  for (const row of rows) {
    const next = extractMediaKey(row.url);
    if (next === row.url) {
      continue;
    }
    changed += 1;
    const line = `[technology:${row.key}] url ${String(row.url)} -> ${String(next)}`;
    if (apply) {
      await prisma.technology.update({
        where: { key: row.key },
        data: { url: next as string },
      });
      console.log(`[applied] ${line}`);
    } else {
      console.log(`[dry-run] ${line}`);
    }
  }
  return changed;
}

async function main(): Promise<void> {
  try {
    const about = await migrateAbout();
    const projects = await migrateProjects();
    const technologies = await migrateTechnologies();
    console.log(
      `[migrate-document-image-paths] mode=${apply ? 'apply' : 'dry-run'} about=${about} projects=${projects} technologies=${technologies}`,
    );
    if (!apply) {
      console.log('Pass --apply to persist changes.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
