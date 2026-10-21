import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_PATH: path.resolve(__dirname, 'functions/node_modules'),
    },
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    reporters: process.env.TEST_REPORT_DIR ? ['default', 'json'] : undefined,
    outputFile: process.env.TEST_REPORT_DIR
      ? { json: `${process.env.TEST_REPORT_DIR}/${process.env.TEST_REPORT_NAME || 'vitest'}.json` }
      : undefined,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
