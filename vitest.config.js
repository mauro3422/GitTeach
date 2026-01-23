import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js', 'tests_real/**/*.test.js'],
    exclude: ['tests/coordinatorAgent.test.js'],
    globals: true,
    setupFiles: ['./tests/vitest-setup.js'],
  },
});