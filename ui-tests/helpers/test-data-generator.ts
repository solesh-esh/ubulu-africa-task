import type { EmployeeData } from './test-data-loader';
import { loadEmployeeTemplate } from './test-data-loader';

export type { EmployeeData };

/**
 * Generates unique employee data for each test invocation.
 *
 * Template values live in test-data/employee-templates.json.
 * Runtime suffixes avoid collisions on the shared OrangeHRM demo.
 */
export function generateEmployeeData(): EmployeeData {
  const template = loadEmployeeTemplate();
  const suffix = Date.now();
  const range = template.employeeIdMax - template.employeeIdMin;
  const employeeId = String(template.employeeIdMin + Math.floor(Math.random() * range));

  return {
    firstName: `${template.firstNamePrefix}${suffix}`,
    lastName: `${template.lastNamePrefix}${suffix}`,
    employeeId,
  };
}
