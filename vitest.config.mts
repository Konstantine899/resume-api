import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'unit',
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.e2e-test.ts', 'node_modules/**', 'dist/**'],
    environment: 'node',
  },
});
