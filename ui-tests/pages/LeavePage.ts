import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { toOrangeHrmDate } from '../helpers/date.helper';

/**
 * Leave → Apply / My Leave list.
 *
 * Date strategy: OrangeHRM renders plain text inputs (placeholder yyyy-dd-mm),
 * not a detached calendar-only widget. We fill via select-all + type + Tab blur
 * rather than opening the date picker overlay (notoriously flaky in CI).
 */
export class LeavePage extends BasePage {
  private readonly applyLeavePath = '/web/index.php/leave/applyLeave';
  private readonly myLeaveListPath = '/web/index.php/leave/viewMyLeaveList';

  readonly leaveTypeDropdown: Locator;
  readonly fromDateInput: Locator;
  readonly toDateInput: Locator;
  readonly reasonTextarea: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;
  readonly leaveListRows: Locator;

  constructor(page: Page) {
    super(page);

    this.leaveTypeDropdown = page.locator('.oxd-select-text').first();
    this.fromDateInput = page.getByPlaceholder('yyyy-dd-mm').first();
    this.toDateInput = page.getByPlaceholder('yyyy-dd-mm').nth(1);
    this.reasonTextarea = page.locator('textarea');
    this.submitButton = page.getByRole('button', { name: 'Apply' });
    this.successMessage = page.getByText(/Successfully Saved/i);
    this.leaveListRows = page.locator('.oxd-table-body .oxd-table-row');
  }

  async navigateToApplyLeave(): Promise<void> {
    await super.navigate(this.applyLeavePath);
    await this.fromDateInput.waitFor({ state: 'visible' });
  }

  async navigateToMyLeaveList(): Promise<void> {
    await super.navigate(this.myLeaveListPath);
    await this.leaveListRows.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {
      // Empty list is possible on a fresh account; rows may appear after first application.
    });
  }

  async selectLeaveType(type: string): Promise<void> {
    await this.leaveTypeDropdown.click();
    await this.page.locator('.oxd-select-dropdown').waitFor({ state: 'visible' });
    await this.page.locator('.oxd-select-option').filter({ hasText: type }).first().click();
  }

  /** @param date ISO format YYYY-MM-DD — converted to OrangeHRM yyyy-dd-mm internally */
  async setFromDate(date: string): Promise<void> {
    await this.fillDateInput(this.fromDateInput, date);
  }

  /** @param date ISO format YYYY-MM-DD — converted to OrangeHRM yyyy-dd-mm internally */
  async setToDate(date: string): Promise<void> {
    await this.fillDateInput(this.toDateInput, date);
  }

  /**
   * Keyboard fill avoids calendar popup flakiness: focus → select-all → type → Tab (blur/validate).
   */
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
    await this.submitButton.click();
    await this.page
      .locator('.oxd-toast')
      .first()
      .waitFor({ state: 'visible', timeout: 10_000 })
      .catch(() => {
        // Inline validation may block submit without a toast.
      });
  }

  /** Returns visible toast text (success, warning, or error). */
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
    return /\/leave\/applyLeave/.test(this.page.url());
  }

  async getLeaveListRowCount(): Promise<number> {
    return this.leaveListRows.count();
  }

  async getLeaveDateRange(rowIndex: number): Promise<string> {
    const row = this.leaveListRows.nth(rowIndex);
    await row.waitFor({ state: 'visible' });
    return (await row.locator('.oxd-table-cell').nth(1).innerText()).trim();
  }

  /** Status column text e.g. "Pending Approval", "Cancelled (3.00)". */
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
