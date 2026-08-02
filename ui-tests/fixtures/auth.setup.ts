/**
 * Auth setup project — runs ONCE before authenticated test projects.
 *
 * WHAT IS storageState?
 * The JSON file we save (.auth/user.json) is a snapshot of the browser's
 * cookies and localStorage after a successful login. Playwright replays it
 * at the start of each test so the app thinks you're already signed in.
 *
 * WHY NOT LOGIN IN EVERY beforeEach?
 * - Speed: one login per run instead of N logins for N tests (~5–10s saved per test).
 * - Stability: the shared OrangeHRM demo login page is slow and sometimes flaky;
 *   fewer visits = fewer chances to hit a bad load or race on the auth form.
 *
 * SESSION EXPIRY RISK (shared demo):
 * If the server invalidates the session mid-run (timeout, demo reset, another
 * user forcing logout), tests will fail with redirects to /auth/login.
 * Mitigation: enable retries in CI (already configured); on retry, the setup
 * project re-runs and refreshes .auth/user.json before the dependent project
 * retries. For longer suites, add a globalSetup or periodic re-auth hook.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { orangeHrmCredentials } from '../helpers/credentials';

const authDir = path.join(__dirname, '../.auth');
const authFile = path.join(authDir, 'user.json');

setup('authenticate as Admin', async ({ page }) => {
  const { username, password } = orangeHrmCredentials();

  fs.mkdirSync(authDir, { recursive: true });

  await page.goto('/web/index.php/auth/login');
  await page.getByPlaceholder('Username').waitFor({ state: 'visible' });

  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await page.waitForURL(/\/dashboard\//, { timeout: 30_000 }).catch(async () => {
    const alert = page.getByRole('alert');
    const errorText = (await alert.isVisible()) ? await alert.innerText() : 'no alert shown';
    throw new Error(`Login failed for user "${username}": ${errorText.trim()}`);
  });

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
