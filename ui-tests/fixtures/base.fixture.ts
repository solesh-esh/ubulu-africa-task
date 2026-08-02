import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Custom fixtures extend Playwright's base test.
 *
 * Usage in specs:
 *   import { test, expect } from '../fixtures/base.fixture';
 */
export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
