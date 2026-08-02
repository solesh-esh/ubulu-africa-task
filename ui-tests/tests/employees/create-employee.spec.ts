import { test, expect } from '../../fixtures/base.fixture';
import { AddEmployeePage } from '../../pages/AddEmployeePage';
import { EmployeeListPage } from '../../pages/EmployeeListPage';
import { generateEmployeeData } from '../../helpers/test-data-generator';

/**
 * AUTH REFACTOR — before vs after (storageState pattern)
 *
 * BEFORE (every test):
 *   beforeEach → open login page → fill credentials → wait for dashboard (~5–10s)
 *   Repeat for each test file and each test case. Slow on the shared demo.
 *
 * AFTER (this file):
 *   fixtures/auth.setup.ts logs in ONCE before the run and saves cookies +
 *   localStorage to .auth/user.json. playwright.config.ts loads that file via
 *   storageState, so each test starts already authenticated — we navigate
 *   straight to PIM/employee pages.
 *
 * Why faster: one login per worker run instead of one per test.
 * Why more stable: fewer round-trips through the login form that can flake
 * when the public demo is under load.
 *
 * Login behaviour is still covered in tests/auth/* (those projects omit storageState).
 */
test.describe('Employee creation', () => {
  let addEmployeePage: AddEmployeePage;
  let employeeListPage: EmployeeListPage;

  test.beforeEach(async ({ page }) => {
    addEmployeePage = new AddEmployeePage(page);
    employeeListPage = new EmployeeListPage(page);
  });

  test('should create employee and find via search', async () => {
    const employee = generateEmployeeData();

    await addEmployeePage.navigate();
    await addEmployeePage.fillEmployeeForm(employee);
    await addEmployeePage.saveEmployee();

    const successMessage = await addEmployeePage.getSuccessMessage();
    expect(successMessage).toMatch(/Successfully Saved/i);

    await employeeListPage.navigate();
    await employeeListPage.searchEmployee(employee.lastName);

    const resultCount = await employeeListPage.getSearchResultCount();
    expect(resultCount).toBeGreaterThanOrEqual(1);

    const firstResultName = await employeeListPage.getFirstResultName();
    expect(firstResultName).toContain(employee.firstName);
    expect(firstResultName).toContain(employee.lastName);
  });

  /**
   * Cleanup policy (shared demo):
   * We do NOT delete created employees after each run. The OrangeHRM public demo
   * has no stable test API for teardown, and delete flows add flakiness without
   * guaranteeing isolation. Instead we rely on run-scoped unique names/IDs
   * (generateEmployeeData) so searches target only records from this test run.
   * Orphaned demo data is an accepted trade-off on shared environments; a dedicated
   * seeded staging env would use factory reset or API cleanup in afterEach.
   */
  test.afterEach(async () => {
    // Intentionally no cleanup — see policy comment above.
  });
});
