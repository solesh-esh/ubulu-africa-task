import { loadEnvironmentConfig } from './test-data-loader';

/** Public OrangeHRM demo defaults — env vars override test-data/environment.json. */
export function orangeHrmCredentials(): { username: string; password: string } {
  const defaults = loadEnvironmentConfig().credentialsDefaults;

  return {
    username: process.env.ORANGEHRM_USERNAME?.trim() || defaults.username,
    password: process.env.ORANGEHRM_PASSWORD?.trim() || defaults.password,
  };
}
