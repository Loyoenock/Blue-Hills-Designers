import { getSupabaseAdmin } from '../lib/supabase';

/**
 * Data Hygiene & Orphan Cleanup Script for Supabase Auth Users (auth.users).
 *
 * Scans all accounts in `auth.users` and compares them against `public.profiles`.
 * Any `auth.users` record without a matching `public.profiles` row (orphans left
 * behind by previous deletion flows) is safely deleted via the Supabase Admin API.
 * This frees up the email addresses for re-registration.
 *
 * Usage:
 *   npx tsx scripts/fixOrphanedAuthUsers.ts
 *   npx tsx scripts/fixOrphanedAuthUsers.ts --dry-run
 */
export async function fixOrphanedAuthUsers(options: { dryRun?: boolean } = {}): Promise<{
  totalAuthUsers: number;
  totalProfiles: number;
  orphanedCount: number;
  deletedCount: number;
  errors: Array<{ id: string; email?: string; error: string }>;
}> {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');

  console.log(`[ORPHAN CLEANUP] Starting auth.users orphan reconciliation (Mode: ${isDryRun ? 'DRY RUN' : 'LIVE CLEANUP'})...`);

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[ORPHAN CLEANUP] CRITICAL: Supabase admin client could not be initialized. Check environment variables.');
    return { totalAuthUsers: 0, totalProfiles: 0, orphanedCount: 0, deletedCount: 0, errors: [] };
  }

  // 1. Fetch all profiles from public.profiles
  console.log('[ORPHAN CLEANUP] Fetching all profile records from public.profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, role');

  if (profilesError) {
    console.error('[ORPHAN CLEANUP] Failed to query profiles table:', profilesError.message);
    return { totalAuthUsers: 0, totalProfiles: 0, orphanedCount: 0, deletedCount: 0, errors: [] };
  }

  const profileIds = new Set((profiles || []).map(p => p.id));
  console.log(`[ORPHAN CLEANUP] Loaded ${profileIds.size} profile record(s) from database.`);

  // 2. Fetch all auth users from auth.users (paginated)
  console.log('[ORPHAN CLEANUP] Fetching all auth users from Supabase Auth...');
  const allAuthUsers: Array<{ id: string; email?: string; created_at?: string }> = [];
  let page = 1;
  const perPage = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: authData, error: authListError } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (authListError) {
      console.error(`[ORPHAN CLEANUP] Error fetching auth users on page ${page}:`, authListError.message);
      break;
    }

    const users = authData?.users || [];
    allAuthUsers.push(...users.map(u => ({ id: u.id, email: u.email, created_at: u.created_at })));

    if (users.length < perPage) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log(`[ORPHAN CLEANUP] Loaded ${allAuthUsers.length} total user(s) from Supabase Auth.`);

  // 3. Identify orphaned auth users
  const orphanedUsers = allAuthUsers.filter(u => !profileIds.has(u.id));

  console.log('------------------------------------------------------------');
  console.log(`[ORPHAN CLEANUP] Total Auth Users:   ${allAuthUsers.length}`);
  console.log(`[ORPHAN CLEANUP] Total Profiles:     ${profileIds.size}`);
  console.log(`[ORPHAN CLEANUP] Orphaned Accounts:  ${orphanedUsers.length}`);
  console.log('------------------------------------------------------------');

  if (orphanedUsers.length === 0) {
    console.log('[ORPHAN CLEANUP] SUCCESS: No orphaned auth accounts found. Database and auth registers are in sync.');
    return {
      totalAuthUsers: allAuthUsers.length,
      totalProfiles: profileIds.size,
      orphanedCount: 0,
      deletedCount: 0,
      errors: []
    };
  }

  console.warn(`[ORPHAN CLEANUP] Found ${orphanedUsers.length} orphaned auth account(s) without matching profiles:`);
  orphanedUsers.forEach(u => {
    console.warn(`  - ID: ${u.id} | Email: ${u.email || '<no email>'} | Created: ${u.created_at || 'unknown'}`);
  });

  if (isDryRun) {
    console.log('[ORPHAN CLEANUP] DRY RUN active: No accounts were deleted.');
    return {
      totalAuthUsers: allAuthUsers.length,
      totalProfiles: profileIds.size,
      orphanedCount: orphanedUsers.length,
      deletedCount: 0,
      errors: []
    };
  }

  // 4. Delete orphaned auth users
  console.log(`[ORPHAN CLEANUP] Deleting ${orphanedUsers.length} orphaned auth account(s)...`);
  let deletedCount = 0;
  const errors: Array<{ id: string; email?: string; error: string }> = [];

  for (const orphan of orphanedUsers) {
    try {
      // shouldSoftDelete: false forces a hard delete to remove auth identities and allow immediate re-registration
      const { error: delError } = await supabase.auth.admin.deleteUser(orphan.id, false);
      if (delError) {
        console.error(`[ORPHAN CLEANUP] Failed to delete orphan auth user ${orphan.id} (${orphan.email}):`, delError.message);
        errors.push({ id: orphan.id, email: orphan.email, error: delError.message });
      } else {
        deletedCount++;
        console.log(`[ORPHAN CLEANUP] [DELETED] ${orphan.id} (${orphan.email || 'no-email'})`);
      }
    } catch (err: any) {
      console.error(`[ORPHAN CLEANUP] Unexpected error deleting ${orphan.id}:`, err?.message);
      errors.push({ id: orphan.id, email: orphan.email, error: err?.message || 'Unknown error' });
    }
  }

  console.log('------------------------------------------------------------');
  console.log(`[ORPHAN CLEANUP] SUMMARY:`);
  console.log(`  - Successfully Deleted: ${deletedCount}/${orphanedUsers.length}`);
  console.log(`  - Failures/Errors:      ${errors.length}`);
  console.log('------------------------------------------------------------');

  return {
    totalAuthUsers: allAuthUsers.length,
    totalProfiles: profileIds.size,
    orphanedCount: orphanedUsers.length,
    deletedCount,
    errors
  };
}

if (typeof require !== 'undefined' && require.main === module) {
  fixOrphanedAuthUsers().catch(console.error);
}
