import { getSupabaseAdmin } from '../lib/supabase';
import { isUUID } from '../lib/utils';

/**
 * Data Hygiene Check Script for Supabase `profiles` table.
 * Identifies any non-UUID profile primary keys present in the database table so operations teams can reconcile.
 * 
 * Usage:
 * npx tsx scripts/checkInvalidProfiles.ts
 */
export async function checkInvalidProfiles(): Promise<{
  totalProfiles: number;
  invalidProfiles: Array<{ id: string; email?: string; full_name?: string }>;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[HYGIENE CHECK] Supabase admin client not initialized. Check environment variables.');
    return { totalProfiles: 0, invalidProfiles: [] };
  }

  console.log('[HYGIENE CHECK] Querying `profiles` table for primary key validation...');
  const { data: profiles, error } = await supabase.from('profiles').select('id, email, full_name, role');

  if (error) {
    console.error('[HYGIENE CHECK] Error querying profiles:', error.message);
    return { totalProfiles: 0, invalidProfiles: [] };
  }

  const allProfiles = profiles || [];
  const invalid = allProfiles.filter(p => !isUUID(p.id));

  console.log(`[HYGIENE CHECK] Total profiles checked: ${allProfiles.length}`);
  if (invalid.length > 0) {
    console.warn(`[HYGIENE CHECK] ALERT: Found ${invalid.length} non-UUID profile row(s) in 'profiles' table:`);
    invalid.forEach(p => {
      console.warn(`  - ID: "${p.id}" | Email: "${p.email}" | Name: "${p.full_name}" | Role: "${p.role}"`);
    });
    console.warn('[HYGIENE CHECK] Manual reconciliation required for these rows before applying strict UUID enforcement.');
  } else {
    console.log('[HYGIENE CHECK] SUCCESS: All profiles in database possess valid UUID primary keys.');
  }

  return {
    totalProfiles: allProfiles.length,
    invalidProfiles: invalid
  };
}

if (require.main === module) {
  checkInvalidProfiles().catch(console.error);
}
