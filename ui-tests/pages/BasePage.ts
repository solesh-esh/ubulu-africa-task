import { Locator, Page } from '@playwright/test';

/**
 * Base Page Object — shared navigation and wait helpers for all OrangeHRM pages.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * Waits until the page reaches network idle.
   * OrangeHRM is an SPA; networkidle may time out on the shared demo, so we
   * fall back silently — callers should still assert on visible elements.
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('networkidle').catch(() => {
      // Shared demo often keeps long-polling connections open.
    });
  }

  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  async isElementVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }

  protected async navigate(path: string): Promise<void> {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }
}
