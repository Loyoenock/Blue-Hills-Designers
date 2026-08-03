export const getRoleRank = (role?: string | null): number => {
  const lower = (role || '').trim().toLowerCase();
  if (lower === 'super admin' || lower === 'super_admin') return 4;
  if (lower === 'admin') return 3;
  if (lower === 'manager') return 2;
  if (lower === 'staff') return 1;
  return 0; // 'customer' or guest or unrecognized
};

export const isAtLeastAdmin = (role?: string | null): boolean => {
  return getRoleRank(role) >= 3;
};
