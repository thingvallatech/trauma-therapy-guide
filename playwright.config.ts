import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321';

export default defineConfig({
  testDir: './e2e',
  timeout: 25_000,
  expect: { timeout: 4000 },
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: { baseURL, browserName: process.env.PLAYWRIGHT_BROWSER === 'webkit' ? 'webkit' : 'chromium', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 4321',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
