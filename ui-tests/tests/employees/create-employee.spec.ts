import { test, expect } from '../../fixtures/base.fixture';
import { LoginPage } from '../../pages/LoginPage';
import { AddEmployeePage } from '../../pages/AddEmployeePage';
import { EmployeeListPage } from '../../pages/EmployeeListPage';
import { generateEmployeeData } from '../../helpers/test-data-generator';

test.describe('Employee creation', () => {
  let loginPage: LoginPage;
  let addEmployeePage: AddEmployeePage;
  let employeeListPage: EmployeeListPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    addEmployeePage = new AddEmployeePage(page);
    employeeListPage = new EmployeeListPage(page);

    await loginPage.navigate();
    await loginPage.login(
      process.env.ORANGEHRM_USERNAME ?? 'Admin',
      process.env.ORANGEHRM_PASSWORD ?? 'admin123',
    );
    expect(await loginPage.isLoggedIn(true)).toBe(true);
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
