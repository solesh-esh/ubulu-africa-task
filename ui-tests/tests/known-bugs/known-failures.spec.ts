/**
 * Known application failures — data in test-data/known-bugs.json
 *
 * Playwright test.fail() semantics:
 * - If the test FAILS → reported as PASSED (expected failure — pipeline stays green)
 * - If the test PASSES → reported as FAILED ("unexpected pass" — bug may be fixed; investigate)
 */
import { test, expect } from '../../fixtures/base.fixture';
import { AddEmployeePage } from '../../pages/AddEmployeePage';
import { loadKnownBugById } from '../../helpers/test-data-loader';

test.describe('Known application bugs (expected failures)', () => {
  test.fail(`${loadKnownBugById('BUG-001').id}: ${loadKnownBugById('BUG-001').title}`, async ({ page }) => {
    const bug = loadKnownBugById('BUG-001');
    const addEmployeePage = new AddEmployeePage(page);
    await addEmployeePage.navigate();

    const lastName = `${bug.lastNamePrefix}${Date.now()}`;

    await addEmployeePage.firstNameInput.fill(bug.invalidFirstName!);
    await addEmployeePage.lastNameInput.fill(lastName);
    await addEmployeePage.clickSaveWithoutFilling();

    expect(await addEmployeePage.hasFirstNameValidationError()).toBe(true);
    expect(await addEmployeePage.remainsOnAddEmployeePage()).toBe(true);
  });

  test.fail(`${loadKnownBugById('BUG-002').id}: ${loadKnownBugById('BUG-002').title}`, async ({ page }) => {
    const bug = loadKnownBugById('BUG-002');

    await page.goto(bug.applyLeavePath!);
    await page.waitForLoadState('domcontentloaded');

    const noLeaveTypesMessage = page.getByText(bug.noLeaveTypesMessage!);
    const fromDateInput = page.getByPlaceholder('yyyy-dd-mm').first();

    expect(await noLeaveTypesMessage.isVisible()).toBe(false);
    expect(await fromDateInput.isVisible()).toBe(true);
  });
});
