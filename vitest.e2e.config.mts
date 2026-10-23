import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// The local docker-compose exposes the test database on port 5433; CI points
// DATABASE_URL at its postgres service explicitly.
const e2eDatabaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://resume_test:resume_test@localhost:5433/resume_api_test?schema=public';

export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      SWAGGER_ENABLED: 'false',
      JWT_ACCESS_SECRET: 'e2e-access-secret-K9$mQ2pL7vN4wR8tY6bD3fH5jG1c',
      JWT_REFRESH_SECRET: 'e2e-refresh-secret-T4nB8kJ2mX6qW9rE1yU5iO3pA7sD',
    },
  },
});
