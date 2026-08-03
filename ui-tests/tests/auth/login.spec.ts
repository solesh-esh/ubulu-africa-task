import { test, expect } from '../../fixtures/base.fixture';
import { LoginPage } from '../../pages/LoginPage';
import { loadLoginScenarioById } from '../../helpers/test-data-loader';
import { orangeHrmCredentials } from '../../helpers/credentials';

/** Imperative login tests — data from test-data/login-scenarios.json (tag: imperative). */
test.describe('OrangeHRM Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should login with valid credentials', async () => {
    const scenario = loadLoginScenarioById('LOGIN-001');
    const { username, password } = orangeHrmCredentials();

    expect(scenario.useEnvCredentials).toBe(true);
    await loginPage.login(username, password);

    expect(await loginPage.isLoggedIn(true)).toBe(true);
    await expect(loginPage.dashboardHeading).toBeVisible();
  });

  test('should show error for invalid password', async () => {
    const scenario = loadLoginScenarioById('LOGIN-002');
    const { username } = orangeHrmCredentials();

    await loginPage.login(username, scenario.password!);

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText(scenario.expectedError!);

    expect(await loginPage.getErrorMessage()).toBe(scenario.expectedError);
    expect(await loginPage.isLoggedIn()).toBe(false);
  });

  test('should show error for empty username', async () => {
    const scenario = loadLoginScenarioById('LOGIN-004');

    await loginPage.passwordInput.fill(scenario.password!);
    await loginPage.loginButton.click();

    expect(await loginPage.getUsernameRequiredError()).toBe(scenario.expectedError);
    expect(await loginPage.getErrorMessage()).toBe('');
    expect(await loginPage.isLoggedIn()).toBe(false);
  });

  test('should show error for empty password', async () => {
    const scenario = loadLoginScenarioById('LOGIN-005');

    await loginPage.usernameInput.fill(scenario.username!);
    await loginPage.loginButton.click();

    expect(await loginPage.getPasswordRequiredError()).toBe(scenario.expectedError);
    expect(await loginPage.getErrorMessage()).toBe('');
    expect(await loginPage.isLoggedIn()).toBe(false);
  });
});
