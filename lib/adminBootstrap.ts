/**
 * Helper to check if an email is listed in the ADMIN_BOOTSTRAP_EMAILS environment variable.
 * MUST only be executed in server-side contexts (API routes, middleware).
 */
export function isBootstrapAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const rawEnv = process.env.ADMIN_BOOTSTRAP_EMAILS || '';
  const list = rawEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
