import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.mjs',
  outputDir: './e2e/test-results',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    headless: true,
    screenshot: 'off',
  },
});
