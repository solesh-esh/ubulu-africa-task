import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { toOrangeHrmDate } from '../helpers/date.helper';
import { loadEnvironmentConfig } from '../helpers/test-data-loader';

/**
 * Leave → Apply / Assign / Leave list.
 *
 * Shared-demo quirk (2026): Admin ESS "Apply Leave" often shows
 * "No Leave Types with Leave Balance" — no form. Admin "Assign Leave" still
 * renders the full form; we fall back automatically in navigateToApplyLeave().
 *
 * Date strategy: fill text inputs (yyyy-dd-mm) via select-all + Tab — no calendar popup.
 */
export class LeavePage extends BasePage {
  private readonly applyLeavePath = '/web/index.php/leave/applyLeave';
  private readonly assignLeavePath = '/web/index.php/leave/assignLeave';
  private readonly myLeaveListPath = '/web/index.php/leave/viewMyLeaveList';
  private readonly leaveListPath = '/web/index.php/leave/viewLeaveList';

  readonly employeeSearchInput: Locator;
  readonly leaveTypeDropdown: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly reasonTextarea: Locator;
  readonly submitApplyButton: Locator;
  readonly submitAssignButton: Locator;
  readonly successMessage: Locator;
  readonly leaveListRows: Locator;
  readonly leaveBalanceText: Locator;

  constructor(page: Page) {
    super(page);

    this.employeeSearchInput = page.getByPlaceholder('Type for hints...').first();
    this.leaveTypeDropdown = page.locator('.oxd-select-text').filter({ hasText: /-- Select --|Leave Type/i }).first();
    this.fromDateInput = page.getByPlaceholder('yyyy-dd-mm').first();
    this.toDateInput = page.getByPlaceholder('yyyy-dd-mm').nth(1);
    this.reasonTextarea = page.locator('textarea');
    this.submitApplyButton = page.getByRole('button', { name: 'Apply' });
    this.submitAssignButton = page.getByRole('button', { name: 'Assign' });
    this.successMessage = page.getByText(/Successfully Saved/i);
    this.leaveListRows = page.locator('.oxd-table-body .oxd-table-row');
    this.leaveBalanceText = page.getByText(/Leave Balance/i);
  }

  /**
   * Opens leave form — Apply Leave if available, otherwise Assign Leave (admin fallback).
   */
  async navigateToApplyLeave(): Promise<void> {
    await super.navigate(this.applyLeavePath);

    const noBalance = this.page.getByText('No Leave Types with Leave Balance');
    if (await noBalance.isVisible().catch(() => false)) {
      const fallback = loadEnvironmentConfig().assignLeaveFallback;
      await super.navigate(this.assignLeavePath);
      await this.selectEmployee(fallback.searchTerm, fallback.employeeName);
    }

    await this.fromDateInput.waitFor({ state: 'visible', timeout: 15_000 });
  }

  async selectEmployee(search: string, optionText: string): Promise<void> {
    await this.employeeSearchInput.fill(search);
    await this.page.locator('.oxd-autocomplete-option').filter({ hasText: optionText }).click();
  }

  async navigateToMyLeaveList(): Promise<void> {
    await super.navigate(this.myLeaveListPath);
    await this.leaveListRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  }

  async navigateToLeaveList(): Promise<void> {
    await super.navigate(this.leaveListPath);
    await this.leaveListRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  }

  async selectLeaveType(type: string): Promise<void> {
    await this.leaveTypeDropdown.click();
    await this.page.locator('.oxd-select-dropdown').waitFor({ state: 'visible' });
    await this.page.locator('.oxd-select-option').filter({ hasText: type }).first().click();
  }

  async getDisplayedLeaveBalance(): Promise<number> {
    const text = await this.page.locator('body').innerText();
    const match = text.match(/Leave Balance\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  async setFromDate(date: string): Promise<void> {
    await this.fillDateInput(this.fromDateInput, date);
  }

  async setToDate(date: string): Promise<void> {
    await this.fillDateInput(this.toDateInput, date);
  }

  private async fillDateInput(input: Locator, isoDate: string): Promise<void> {
    const orangeDate = toOrangeHrmDate(isoDate);
    await input.click();
    await input.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await input.fill(orangeDate);
    await input.press('Tab');
  }

  async setReason(reason: string): Promise<void> {
    await this.reasonTextarea.fill(reason);
  }

  async submitLeaveApplication(): Promise<void> {
    if (await this.submitAssignButton.isVisible().catch(() => false)) {
      await this.submitAssignButton.click();
    } else {
      await this.submitApplyButton.click();
    }

    await this.page
      .locator('.oxd-toast')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {});
  }

  async getSuccessMessage(): Promise<string> {
    const toastContainer = this.page.locator('.oxd-toast').first();

    if (await toastContainer.isVisible().catch(() => false)) {
      return (await toastContainer.innerText()).trim();
    }

    return '';
  }

  async getValidationErrors(): Promise<string[]> {
    return this.page.locator('.oxd-input-field-error-message').allTextContents();
  }

  async remainsOnApplyLeavePage(): Promise<boolean> {
    return /\/leave\/(applyLeave|assignLeave)/.test(this.page.url());
  }

  async getLeaveListRowCount(): Promise<number> {
    return this.leaveListRows.count();
  }

  async getLeaveDateRange(rowIndex: number): Promise<string> {
    const row = this.leaveListRows.nth(rowIndex);
    await row.waitFor({ state: 'visible' });
    return (await row.locator('.oxd-table-cell').nth(1).innerText()).trim();
  }

  async getLeaveStatus(rowIndex: number): Promise<string> {
    const row = this.leaveListRows.nth(rowIndex);
    await row.waitFor({ state: 'visible' });
    return (await row.locator('.oxd-table-cell').nth(6).innerText()).trim();
  }

  async findRowIndexByDateRange(dateRange: string): Promise<number> {
    const count = await this.leaveListRows.count();
    for (let i = 0; i < count; i++) {
      const cellText = await this.getLeaveDateRange(i);
      if (cellText.includes(dateRange)) {
        return i;
      }
    }
    return -1;
  }
}
