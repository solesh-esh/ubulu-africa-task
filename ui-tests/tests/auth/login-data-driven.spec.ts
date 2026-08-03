import { test, expect } from '../../fixtures/base.fixture';
import { LoginPage } from '../../pages/LoginPage';
import { loadLoginScenarios } from '../../helpers/test-data-loader';
import { orangeHrmCredentials } from '../../helpers/credentials';

/**
 * Data-driven login validation
 *
 * Test data: test-data/login-scenarios.json
 * - Single test logic, multiple inputs — a fix to navigation or assertions applies to all scenarios at once.
 * - New cases (e.g. SQLi, XSS) are one row in JSON, not a whole new spec file.
 * - Reports show each scenario description as a distinct test title for easier triage in CI/HTML report.
 */

async function assertLoginFailure(
  loginPage: LoginPage,
  expectedError?: string,
  username = '',
): Promise<void> {
  expect(await loginPage.isLoggedIn()).toBe(false);

  if (!expectedError) {
    return;
  }

  if (expectedError === 'Required') {
    const fieldError =
      username === ''
        ? await loginPage.getUsernameRequiredError()
        : await loginPage.getPasswordRequiredError();
    expect(fieldError).toContain(expectedError);
    return;
  }

  await expect(loginPage.errorMessage).toBeVisible();
  const alertMessage = await loginPage.getErrorMessage();
  expect(alertMessage).toContain(expectedError);
}

/**
 * SQL injection scenario note:
 * This is a UI-level negative test — we verify malicious input does not bypass the login
 * form and reach the dashboard. It is NOT a database security audit; Playwright cannot
 * prove SQL injection is impossible server-side. Passing means the app rejected the
 * attempt in the UI (invalid credentials or validation), not that the DB layer is safe.
 */
loadLoginScenarios().forEach((scenario) => {
  test(`login validation: ${scenario.description}`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    const demoCreds = orangeHrmCredentials();
    const username = scenario.useEnvCredentials ? demoCreds.username : (scenario.username ?? '');
    const password = scenario.useEnvCredentials ? demoCreds.password : (scenario.password ?? '');

    await loginPage.login(username, password);

    if (scenario.shouldSucceed) {
      expect(await loginPage.isLoggedIn(true)).toBe(true);
      await expect(loginPage.dashboardHeading).toBeVisible();
    } else {
      await assertLoginFailure(loginPage, scenario.expectedError, scenario.username);
    }
  });
});
