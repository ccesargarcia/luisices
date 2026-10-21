import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    reporters: process.env.TEST_REPORT_DIR ? ['default', 'json'] : undefined,
    outputFile: process.env.TEST_REPORT_DIR
      ? { json: `${process.env.TEST_REPORT_DIR}/${process.env.TEST_REPORT_NAME || 'vitest-integration'}.json` }
      : undefined,
  },
});
