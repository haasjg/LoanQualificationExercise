import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist', 'src/__archived_tests__/**'],
    setupFiles: ['src/setupTests.ts'],
  },
});
