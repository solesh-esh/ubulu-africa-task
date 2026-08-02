import { Page } from '@playwright/test';

/**
 * Prefer Playwright auto-waiting locators over hard sleeps.
 * Use these helpers only for non-DOM conditions (e.g. toast dismissal).
 */
export async function waitForNetworkIdle(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    // Shared demo may never reach true networkidle; domcontentloaded is enough.
  });
}
