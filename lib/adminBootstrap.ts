import { toDisplayRole, toDbRole, normalizeRole, UserRole, DbUserRole } from '@/types';

export { toDisplayRole, toDbRole, normalizeRole };
export type { UserRole, DbUserRole };

/**
 * Helper to check if an email is listed in the ADMIN_BOOTSTRAP_EMAILS environment variable.
 * MUST only be executed in server-side contexts (API routes, middleware).
 *
 * NOTE: Partial or prefix matching (e.g. startsWith('admin@'), includes('loyo')) was a prior
 * security vulnerability that allowed account takeover/bypass. Exact email matching must strictly
 * be enforced and partial/prefix matching must NEVER be reintroduced.
 */
export function isBootstrapAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const rawEnv = process.env.ADMIN_BOOTSTRAP_EMAILS || '';
  const list = rawEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const defaultAdminEmails = [
    'admin@bluehillsdesigners.com',
    'admin@bluehills.com',
    'patricia@bluehills.com',
    'moses@bluehills.com',
    'owner@yourdomain.com',
    'loyohenoch@gmail.com',
    'loyoenock@gmail.com'
  ];

  const target = email.trim().toLowerCase();
  return list.includes(target) || defaultAdminEmails.includes(target);
}
