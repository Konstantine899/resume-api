import { defineConfig } from 'vitest/config';

// End-to-end smoke tests: they boot the real Nest application and need a
// reachable PostgreSQL (docker compose service `db`).
export default defineConfig({
  test: {
    name: 'e2e',
    include: ['src/**/*.e2e-test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
