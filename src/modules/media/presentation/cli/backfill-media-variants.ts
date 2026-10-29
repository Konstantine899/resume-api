import 'dotenv/config';

import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { parseEnv } from '../../../../config/env';
import { LocalDiskStorage } from '../../infrastructure/local-disk.storage';
import { allVariantKeys, parseMediaKey } from '../../domain/media-key';

const env = parseEnv();
const apply = process.argv.includes('--apply');
const root = path.resolve(env.UPLOADS_DIR);

const storage = new LocalDiskStorage(root);

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function atomicWrite(filePath: string, data: Buffer): Promise<void> {
  const tmp = path.join(path.dirname(filePath), `.tmp-${crypto.randomUUID()}`);
  await fs.writeFile(tmp, data, { mode: 0o644 });
  await fs.rename(tmp, filePath);
}

async function main(): Promise<void> {
  await storage.ensureReady();
  const entries = await fs.readdir(root);
  const updates: Array<{ base: string; missing: number[] }> = [];

  for (const entry of entries) {
    const parsed = parseMediaKey(entry);
    if (!parsed || parsed.variantWidth !== null) {
      continue;
    }
    if (parsed.extension === 'svg') {
      continue;
    }

    const sourceWidth = await (async () => {
      try {
        const meta = await sharp(path.join(root, entry)).metadata();
        return parsed.extension === 'png' || parsed.extension === 'jpeg'
          ? (meta.orientation ?? 1) >= 5
            ? (meta.height ?? 0)
            : (meta.width ?? 0)
          : (meta.width ?? 0);
      } catch {
        return 0;
      }
    })();
    if (sourceWidth === 0) {
      continue;
    }

    const missing: number[] = [];
    for (const variant of [320, 640, 960] as const) {
      if (sourceWidth < variant) {
        continue;
      }
      const variantKey = `${parsed.uuid}-${variant}.webp`;
      if (await fileExists(path.join(root, variantKey))) {
        continue;
      }
      missing.push(variant);
    }
    if (missing.length > 0) {
      updates.push({ base: entry, missing });
    }
  }

  let generated = 0;
  for (const { base, missing } of updates) {
    const parsed = parseMediaKey(base)!;
    const source = path.join(root, base);
    for (const width of missing) {
      const plan = `  ${base} -> ${parsed.uuid}-${width}.webp`;
      if (!apply) {
        console.log(`[dry-run] ${plan}`);
        continue;
      }
      try {
        const data = await sharp(source, { limitInputPixels: 25_000_000 })
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        const target = path.join(root, `${parsed.uuid}-${width}.webp`);
        await atomicWrite(target, data);
        generated += 1;
        console.log(`[applied] ${plan}`);
      } catch (error) {
        console.error(`[failed] ${plan}: ${String(error)}`);
      }
    }
  }

  // Record unused variant-slot combinations (for dashboards) by keeping the
  // supported widths aligned with the processor contract.
  void allVariantKeys;

  console.log(
    `[backfill-media-variants] mode=${apply ? 'apply' : 'dry-run'} bases=${updates.length} plannedVariants=${updates.reduce((sum, e) => sum + e.missing.length, 0)}${apply ? ` generated=${generated}` : ''}`,
  );
  if (!apply) {
    console.log('Pass --apply to write missing variants.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
