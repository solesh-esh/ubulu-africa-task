/**
 * Known application failures — expected to fail until OrangeHRM fixes the defects.
 *
 * Playwright test.fail() semantics:
 * - If the test FAILS → reported as PASSED (expected failure — pipeline stays green)
 * - If the test PASSES → reported as FAILED ("unexpected pass" — bug may be fixed; investigate)
 *
 * Why not test.skip()?
 * - skip() removes coverage entirely — you never learn when the bug is fixed.
 * - test.fail() keeps the regression test running every CI build and alerts you
 *   the moment behaviour changes.
 */
import { test, expect } from '../../fixtures/base.fixture';
import { AddEmployeePage } from '../../pages/AddEmployeePage';

test.describe('Known application bugs (expected failures)', () => {
  /**
   * BUG-001 | Special characters accepted in employee first name without validation
   * Date found: 2026-08-02 | Severity: Medium (HR data quality / reporting integrity)
   *
   * Expected: first name "Test@#$%" rejected with inline validation or blocked save.
   * Actual: OrangeHRM OS 5.9 saves the employee and redirects to personal details.
   */
  test.fail('BUG-001: employee first name should reject special characters', async ({ page }) => {
    const addEmployeePage = new AddEmployeePage(page);
    await addEmployeePage.navigate();

    const invalidFirstName = 'Test@#$%';
    const lastName = `BugCheck${Date.now()}`;

    await addEmployeePage.firstNameInput.fill(invalidFirstName);
    await addEmployeePage.lastNameInput.fill(lastName);
    await addEmployeePage.clickSaveWithoutFilling();

    // Correct product behaviour: stay on form with a validation error.
    expect(await addEmployeePage.hasFirstNameValidationError()).toBe(true);
    expect(await addEmployeePage.remainsOnAddEmployeePage()).toBe(true);
  });

  /**
   * BUG-002 | Admin Apply Leave shows empty state instead of leave form
   * Date found: 2026-08-02 | Severity: High (core ESS leave workflow blocked for Admin)
   *
   * Expected: authenticated Admin sees Apply Leave form (leave type + date fields).
   * Actual: page displays "No Leave Types with Leave Balance" — no inputs rendered.
   */
  test.fail('BUG-002: Admin Apply Leave should render leave request form', async ({ page }) => {
    await page.goto('/web/index.php/leave/applyLeave');
    await page.waitForLoadState('domcontentloaded');

    const noLeaveTypesMessage = page.getByText('No Leave Types with Leave Balance');
    const fromDateInput = page.getByPlaceholder('yyyy-dd-mm').first();

    expect(await noLeaveTypesMessage.isVisible()).toBe(false);
    expect(await fromDateInput.isVisible()).toBe(true);
  });
});
