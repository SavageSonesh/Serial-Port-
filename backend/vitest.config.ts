import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    env: {
      DATABASE_URL: 'file:./test.db',
    },
    // DB tests share one SQLite file — keep them in a single worker.
    fileParallelism: false,
  },
});
