/** Public OrangeHRM demo defaults — used when env/secrets are unset or empty. */
export function orangeHrmCredentials(): { username: string; password: string } {
  return {
    username: process.env.ORANGEHRM_USERNAME?.trim() || 'Admin',
    password: process.env.ORANGEHRM_PASSWORD?.trim() || 'admin123',
  };
}
