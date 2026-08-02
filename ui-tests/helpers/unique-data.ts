/**
 * Generates run-scoped unique values so tests do not collide on the shared demo.
 */
export function uniqueId(prefix = 'qa'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export function uniqueEmployeeName(prefix = 'Auto'): string {
  return `${prefix} ${uniqueId('emp')}`;
}

export function uniqueEmail(domain = 'example.com'): string {
  return `${uniqueId('user')}@${domain}`;
}
