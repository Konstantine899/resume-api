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
    // The suites boot the real app, so they validate the same env schema —
    // these defaults keep them self-sufficient on a checkout without a .env
    // (dotenv never overwrites them; CI may set its own values).
    env: {
      ADMIN_EMAIL: 'admin@example.test',
      ADMIN_PASSWORD: 'e2e-admin-password-123',
      FRONTEND_ORIGIN: 'http://localhost:5173',
      COOKIE_PATH: '/auth',
    },
  },
});
