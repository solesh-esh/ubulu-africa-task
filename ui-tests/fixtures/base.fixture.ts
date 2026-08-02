import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Custom fixtures extend Playwright's base test.
 *
 * Authenticated specs (employees/, leave/) rely on storageState from
 * fixtures/auth.setup.ts — no manual login in beforeEach.
 * Login specs (tests/auth/) use chromium-login / firefox-login projects
 * which intentionally omit storageState.
 *
 * Usage: import { test, expect } from '../fixtures/base.fixture';
 */
export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
