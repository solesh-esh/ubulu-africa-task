import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Auth pattern: fixtures/auth.setup.ts logs in once → saves .auth/user.json
 * (cookies + localStorage). Authenticated projects load that file via storageState
 * so tests skip the login page. See auth.setup.ts for junior-friendly comments.
 */
const authFile = path.join(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: 'test-results/',
  // Sharded Chromium jobs set PLAYWRIGHT_BLOB_REPORT=true for merge-reports.
  // Other CI jobs (Firefox) keep the HTML reporter for direct artifact upload.
  reporter: process.env.PLAYWRIGHT_BLOB_REPORT
    ? [['blob'], ['list']]
    : [['html'], ['list']],
  use: {
    baseURL: 'https://opensource-demo.orangehrmlive.com',
    headless: !!process.env.CI,
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // Runs first, serially — saves authenticated storageState for other projects.
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      testDir: './fixtures',
    },
    // Authenticated suites — reuse saved session; skip tests/auth (those test login itself).
    {
      name: 'chromium',
      testIgnore: /auth\//,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
        channel: process.env.CI ? undefined : 'chrome',
      },
    },
    {
      name: 'firefox',
      testIgnore: /auth\//,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: authFile,
      },
    },
    // Login specs must start unauthenticated — no storageState, no setup dependency.
    {
      name: 'chromium-login',
      testMatch: /auth\//,
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.CI ? undefined : 'chrome',
      },
    },
    {
      name: 'firefox-login',
      testMatch: /auth\//,
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
