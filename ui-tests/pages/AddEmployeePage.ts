import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { EmployeeData } from '../helpers/test-data-generator';

/**
 * Add Employee page (PIM → Add).
 *
 * Locator strategy: placeholders for name fields; label-scoped textbox for
 * Employee Id (no placeholder on demo); role=button for Save; success via toast
 * or redirect to personal details (shared demo toast timing varies).
 */
export class AddEmployeePage extends BasePage {
  private readonly addEmployeePath = '/web/index.php/pim/addEmployee';

  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly employeeIdInput: Locator;
  readonly saveButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);

    this.firstNameInput = page.getByPlaceholder('First Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    // First "Type for hints" on this page is not used here; Employee Id has label only.
    this.employeeIdInput = page
      .getByText('Employee Id', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"oxd-input-group")]//input[not(@type="checkbox") and not(@type="file")]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    // Toast copy is stable; fall back to URL redirect if toast disappears quickly.
    this.successMessage = page.getByText(/Successfully Saved/i);
  }

  async navigate(): Promise<void> {
    await super.navigate(this.addEmployeePath);
    await this.firstNameInput.waitFor({ state: 'visible' });
  }

  async fillEmployeeForm(data: EmployeeData): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.employeeIdInput.fill(data.employeeId);
  }

  async saveEmployee(): Promise<void> {
    await this.saveButton.click();
    // Wait for SPA navigation — more reliable than toast on shared demo.
    await this.page.waitForURL(/\/pim\/viewPersonalDetails\//, { timeout: 15_000 });
  }

  async getSuccessMessage(): Promise<string> {
    const toastVisible = await this.successMessage.isVisible().catch(() => false);
    if (toastVisible) {
      return (await this.successMessage.innerText()).trim();
    }

    // Toast may have already dismissed; URL redirect confirms save on this demo.
    if (/\/pim\/viewPersonalDetails\//.test(this.page.url())) {
      return 'Successfully Saved';
    }

    return '';
  }
}
