import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Employee List page (PIM → Employee List).
 *
 * Locator strategy: first "Type for hints..." maps to Employee Name filter;
 * Search submit button; result rows scoped to table body (demo lacks row roles).
 */
export class EmployeeListPage extends BasePage {
  private readonly employeeListPath = '/web/index.php/pim/viewEmployeeList';

  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly resultRows: Locator;

  constructor(page: Page) {
    super(page);

    // Employee Name is the first autocomplete filter; Supervisor uses the second.
    this.searchInput = page.getByPlaceholder('Type for hints...').first();
    this.searchButton = page.getByRole('button', { name: 'Search' });
    // Table rows have no accessible row roles on this demo build.
    this.resultRows = page.locator('.oxd-table-body .oxd-table-row');
  }

  async navigate(): Promise<void> {
    await super.navigate(this.employeeListPath);
    await this.searchInput.waitFor({ state: 'visible' });
  }

  async searchEmployee(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await this.searchButton.click();
    // Wait for table to settle — auto-wait on first row or empty state.
    await this.page.waitForLoadState('domcontentloaded');
    await this.resultRows.first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {
      // Zero rows is valid for negative tests; create flow expects ≥1 row.
    });
  }

  async getSearchResultCount(): Promise<number> {
    return this.resultRows.count();
  }

  /**
   * Returns "First Last" from the first result row (columns: Id, First Name, Last Name, …).
   */
  async getFirstResultName(): Promise<string> {
    const firstRow = this.resultRows.first();
    await firstRow.waitFor({ state: 'visible' });

    const firstName = (await firstRow.locator('.oxd-table-cell').nth(2).innerText()).trim();
    const lastName = (await firstRow.locator('.oxd-table-cell').nth(3).innerText()).trim();

    return `${firstName} ${lastName}`.trim();
  }
}
