import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Run tests in Node environment (not browser)
        environment: 'node',
        // Include files in tests/ directory
        include: ['tests/**/*.test.js'],
        // Global test utilities
        globals: true,
    },
    resolve: {
        alias: {
            // Allow importing from src
            '@': '/src/renderer/js',
        },
    },
});
