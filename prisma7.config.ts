// Prisma 7 CLI config (replaces the Prisma 6-era .env auto-loading: the CLI
// only reads environment variables that this file loads explicitly).
import 'dotenv/config';

import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
