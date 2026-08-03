import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import type { EmployeeData } from '../helpers/test-data-loader';

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
  readonly formAlert: Locator;

  constructor(page: Page) {
    super(page);

    this.firstNameInput = page.getByPlaceholder('First Name');
    this.lastNameInput = page.getByPlaceholder('Last Name');
    this.employeeIdInput = page
      .getByText('Employee Id', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"oxd-input-group")]//input[not(@type="checkbox") and not(@type="file")]');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.successMessage = page.getByText(/Successfully Saved/i);
    this.formAlert = page.getByRole('alert');
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
    await this.page.waitForURL(/\/pim\/viewPersonalDetails\//, { timeout: 15_000 });
  }

  /** Clicks Save without waiting for success navigation (validation / negative flows). */
  async clickSaveWithoutFilling(): Promise<void> {
    await this.saveButton.click();
  }

  private fieldValidationMessage(field: 'firstName' | 'lastName'): Locator {
    const placeholder = field === 'firstName' ? 'First Name' : 'Last Name';
    return this.page
      .getByPlaceholder(placeholder)
      .locator('xpath=../following-sibling::span[contains(@class,"oxd-input-field-error-message")]');
  }

  async getFirstNameError(): Promise<string> {
    const message = this.fieldValidationMessage('firstName');
    await message.waitFor({ state: 'visible' });
    return (await message.innerText()).trim();
  }

  async getLastNameError(): Promise<string> {
    const message = this.fieldValidationMessage('lastName');
    await message.waitFor({ state: 'visible' });
    return (await message.innerText()).trim();
  }

  async getEmployeeIdError(): Promise<string> {
    const message = this.employeeIdInput.locator(
      'xpath=../following-sibling::span[contains(@class,"oxd-input-field-error-message")]',
    );
    await message.waitFor({ state: 'visible' });
    return (await message.innerText()).trim();
  }

  async getFormAlertMessage(): Promise<string> {
    const visible = await this.formAlert.isVisible().catch(() => false);
    if (!visible) {
      return '';
    }
    return (await this.formAlert.innerText()).trim();
  }

  async getFirstNameValue(): Promise<string> {
    return this.firstNameInput.inputValue();
  }

  async wasEmployeeSaved(): Promise<boolean> {
    try {
      await this.page.waitForURL(/\/pim\/viewPersonalDetails\//, { timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }

  async hasFirstNameValidationError(): Promise<boolean> {
    return this.fieldValidationMessage('firstName').isVisible();
  }

  async getSuccessMessage(): Promise<string> {
    const toastVisible = await this.successMessage.isVisible().catch(() => false);
    if (toastVisible) {
      return (await this.successMessage.innerText()).trim();
    }

    if (/\/pim\/viewPersonalDetails\//.test(this.page.url())) {
      return 'Successfully Saved';
    }

    return '';
  }

  async remainsOnAddEmployeePage(): Promise<boolean> {
    return /\/pim\/addEmployee/.test(this.page.url());
  }
}
