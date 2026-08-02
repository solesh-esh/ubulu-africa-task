import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Login Page Object for OrangeHRM OS 5.x
 *
 * Locator strategy (shared public demo — avoid brittle selectors):
 * 1. data-testid — none present on the login form in OS 5.9; re-check after upgrades.
 * 2. ARIA roles & accessible names — primary strategy (button, alert, heading).
 * 3. Placeholder text — stable on OrangeHRM demo inputs ("Username", "Password").
 * 4. input[name] — semantic HTML attribute, not CSS; used only for field-scoped validation errors.
 *
 * We deliberately avoid oxd-* CSS classes — they are implementation details and change between releases.
 */
export class LoginPage extends BasePage {
  private readonly loginPath = '/web/index.php/auth/login';

  // Placeholders are stable on the public demo and survive theme/CSS refactors better than classes.
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  // role=alert is the accessible error banner for invalid credentials (not field-level "Required").
  readonly errorMessage: Locator;
  readonly dashboardHeading: Locator;

  constructor(page: Page) {
    super(page);

    this.usernameInput = page.getByPlaceholder('Username');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorMessage = page.getByRole('alert');
    this.dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
  }

  async navigate(): Promise<void> {
    await super.navigate(this.loginPath);
    await this.usernameInput.waitFor({ state: 'visible' });
  }

  /** Field-level validation message (e.g. "Required") scoped to a single input. */
  private fieldValidationMessage(field: 'username' | 'password'): Locator {
    const placeholder = field === 'username' ? 'Username' : 'Password';
    // Error span is a DOM sibling of the input wrapper — no CSS class selector needed.
    return this.page
      .getByPlaceholder(placeholder)
      .locator('xpath=../following-sibling::span[contains(normalize-space(.), "Required")]');
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /** Global auth error banner (invalid credentials). Empty string if not shown. */
  async getErrorMessage(): Promise<string> {
    const visible = await this.errorMessage.isVisible().catch(() => false);
    if (!visible) {
      return '';
    }
    return (await this.errorMessage.innerText()).trim();
  }

  /** Inline "Required" validation for the username field. */
  async getUsernameRequiredError(): Promise<string> {
    const message = this.fieldValidationMessage('username');
    await message.waitFor({ state: 'visible' });
    return (await message.innerText()).trim();
  }

  /** Inline "Required" validation for the password field. */
  async getPasswordRequiredError(): Promise<string> {
    const message = this.fieldValidationMessage('password');
    await message.waitFor({ state: 'visible' });
    return (await message.innerText()).trim();
  }

  /**
   * Successful login redirects to dashboard and renders the Dashboard heading.
   * URL + heading is more reliable than sidebar state on the shared demo.
   *
   * @param waitForRedirect — pass true after submitting valid credentials (waits for SPA redirect).
   *   Omit on negative tests to avoid a 15s timeout while still on the login page.
   */
  async isLoggedIn(waitForRedirect = false): Promise<boolean> {
    if (waitForRedirect) {
      try {
        await this.page.waitForURL(/\/dashboard\//, { timeout: 15_000 });
        await this.dashboardHeading.waitFor({ state: 'visible', timeout: 10_000 });
      } catch {
        return false;
      }
    }

    if (!/\/dashboard\//.test(this.page.url())) {
      return false;
    }

    return this.dashboardHeading.isVisible();
  }
}
