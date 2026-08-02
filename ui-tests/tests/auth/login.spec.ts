import { test, expect } from '../../fixtures/base.fixture';
import { LoginPage } from '../../pages/LoginPage';

test.describe('OrangeHRM Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should login with valid credentials', async () => {
    const username = process.env.ORANGEHRM_USERNAME ?? 'Admin';
    const password = process.env.ORANGEHRM_PASSWORD ?? 'admin123';

    await loginPage.login(username, password);

    expect(await loginPage.isLoggedIn(true)).toBe(true);
    await expect(loginPage.dashboardHeading).toBeVisible();
  });

  test('should show error for invalid password', async () => {
    const username = process.env.ORANGEHRM_USERNAME ?? 'Admin';

    await loginPage.login(username, 'wrongpassword');

    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toHaveText('Invalid credentials');

    expect(await loginPage.getErrorMessage()).toBe('Invalid credentials');
    expect(await loginPage.isLoggedIn()).toBe(false);
  });

  test('should show error for empty username', async () => {
    await loginPage.passwordInput.fill('admin123');
    await loginPage.loginButton.click();

    expect(await loginPage.getUsernameRequiredError()).toBe('Required');
    expect(await loginPage.getErrorMessage()).toBe('');
    expect(await loginPage.isLoggedIn()).toBe(false);
  });

  test('should show error for empty password', async () => {
    await loginPage.usernameInput.fill('Admin');
    await loginPage.loginButton.click();

    expect(await loginPage.getPasswordRequiredError()).toBe('Required');
    expect(await loginPage.getErrorMessage()).toBe('');
    expect(await loginPage.isLoggedIn()).toBe(false);
  });
});
