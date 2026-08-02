/**
 * Employee record shape used by Add Employee form tests.
 */
export interface EmployeeData {
  firstName: string;
  lastName: string;
  employeeId: string;
}

/**
 * Generates unique employee data for each test invocation.
 *
 * Why unique data matters on a shared demo:
 * OrangeHRM OS demo is a public environment — multiple testers and CI jobs
 * mutate the same employee list concurrently. Static names (e.g. "John Doe")
 * cause search collisions, false positives (matching another user's record),
 * and flaky failures when parallel workers create duplicate IDs. Timestamp +
 * random suffixes scope each run to its own records without requiring DB cleanup.
 */
export function generateEmployeeData(): EmployeeData {
  const suffix = Date.now();
  const employeeId = String(Math.floor(1000 + Math.random() * 9000));

  return {
    firstName: `AutoFirst${suffix}`,
    lastName: `AutoLast${suffix}`,
    employeeId,
  };
}
