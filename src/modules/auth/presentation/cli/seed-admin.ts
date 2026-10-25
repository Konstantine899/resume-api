import { NestFactory } from '@nestjs/core';

import { validateEnv } from '../../../../config/env';
import { AdminSeedService } from '../../application/admin-seed.service';
import { SeedModule } from './seed.module';

/**
 * CLI entry point: `npm run seed:admin`.
 *
 * The ONLY way to create a user on this site (SPEC C12): reads
 * ADMIN_EMAIL / ADMIN_PASSWORD from the (validated) environment, hashes the
 * password with argon2id and upserts the admin idempotently.
 */
async function main(): Promise<void> {
  const env = validateEnv();
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['error', 'warn'],
  });
  try {
    const seeder = app.get(AdminSeedService);
    const result = await seeder.run({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    });
    process.stdout.write(
      `[seed:admin] ${result.created ? 'created' : 'updated'}: ${result.email}\n`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[seed:admin] failed: ${message}\n`);
  process.exit(1);
});
