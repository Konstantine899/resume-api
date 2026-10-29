import 'dotenv/config';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { parseEnv } from '../../../../config/env';
import { PrismaService } from '../../../../prisma/prisma.service';
import { parseMediaKey } from '../../domain/media-key';

const env = parseEnv();
const apply = process.argv.includes('--apply');
const prisma = new PrismaService();

async function referencedKeys(): Promise<Set<string>> {
  const refs = new Set<string>();
  const [about, projects, technologies] = await Promise.all([
    prisma.aboutContent.findMany({ select: { portrait: true } }),
    prisma.project.findMany({ select: { image: true } }),
    prisma.technology.findMany({ select: { url: true } }),
  ]);
  for (const row of about) {
    if (typeof row.portrait === 'string' && row.portrait.trim() !== '') {
      refs.add(row.portrait.trim());
    }
  }
  for (const row of projects) {
    refs.add(row.image);
  }
  for (const row of technologies) {
    refs.add(row.url);
  }
  return refs;
}

async function main(): Promise<void> {
  const root = path.resolve(env.UPLOADS_DIR);
  const refs = await referencedKeys();
  const entries = await fs.readdir(root);
  const candidates: string[] = [];

  for (const entry of entries) {
    const parsed = parseMediaKey(entry);
    if (!parsed) {
      continue;
    }
    // Only orphan "base" files are candidates; variants are swept via their base.
    if (parsed.variantWidth !== null) {
      continue;
    }
    if (!refs.has(entry)) {
      candidates.push(entry);
    }
  }

  console.log(
    `[gc-media] mode=${apply ? 'apply' : 'dry-run'} orphanBases=${candidates.length}` +
      (apply ? '' : ' (pass --apply to delete)'),
  );
  for (const key of candidates) {
    if (apply) {
      const filePath = path.join(root, key);
      try {
        await fs.unlink(filePath);
        const parsed = parseMediaKey(key);
        if (parsed) {
          for (const width of [320, 640, 960] as const) {
            const variant = path.join(root, `${parsed.uuid}-${width}.webp`);
            await fs.unlink(variant).catch(() => undefined);
          }
        }
        console.log(`[applied] removed ${key}`);
      } catch (error) {
        console.error(`[failed] ${key}: ${String(error)}`);
      }
    } else {
      console.log(`[dry-run] orphan ${key}`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
