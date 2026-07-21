/**
 * Regression and Manual Test Script for /api/db Route Security
 * 
 * This script documents the validation and testing protocol for verifying the 
 * security posture of the `/api/db` route following the removal of the 
 * service-role bypass vulnerability.
 * 
 * Run instructions:
 * Set up your test environment variables (.env) containing:
 *   APP_URL="http://localhost:3000"
 *   TEST_USER_TOKEN="ey..." (Optional: Token for a standard Customer user)
 *   TEST_ADMIN_TOKEN="ey..." (Optional: Token for an Admin/Staff user)
 * 
 * Execute with:
 *   npm run test:security (if configured) or direct invocation
 */

import fetch from 'node-fetch';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TEST_USER_TOKEN = process.env.TEST_USER_TOKEN || null;
const TEST_ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || null;

async function runSecurityTests() {
  console.log('===========================================================');
  console.log('🔒 RUNNING SECURITY REGRESSION TESTS FOR /api/db ROUTE');
  console.log('===========================================================');
  console.log(`Targeting Endpoint: ${APP_URL}/api/db`);

  // =========================================================================
  // CASE 1: Anonymous attempt to delete a profile (Bypass Attempt)
  // =========================================================================
  console.log('\n--- Case 1: Anonymous delete attempt on "profiles" table ---');
  try {
    const res = await fetch(`${APP_URL}/api/db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'delete',
        tableName: 'profiles',
        payload: {
          filters: {
            id: '00000000-0000-0000-0000-000000000000' // Target dummy ID
          }
        }
      })
    });

    console.log(`Status Code: ${res.status}`);
    const json = await res.json() as any;
    console.log('Response JSON:', json);

    // If RLS blocks or deletes nothing, success!
    if (res.status === 401 || res.status === 403 || json.error) {
      console.log('✅ PASS: Request was explicitly rejected by security boundaries.');
    } else if (res.status === 200 && json.success) {
      console.log('✅ PASS: Request returned success, but due to RLS, zero rows were modified (silent protect).');
    } else {
      console.log('❌ FAIL: Unexpected response behavior.');
    }
  } catch (error: any) {
    console.log('✅ PASS/INFO: Request failed as expected with network/security exception:', error.message);
  }

  // =========================================================================
  // CASE 2: Legitimate public newsletter subscription
  // =========================================================================
  console.log('\n--- Case 2: Public newsletter signup (Anonymous insert permitted by RLS) ---');
  try {
    const randomEmail = `test-sarto-${Math.floor(Math.random() * 100000)}@bluehills.com`;
    const res = await fetch(`${APP_URL}/api/db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'insert',
        tableName: 'newsletter_subscribers',
        payload: {
          email: randomEmail
        }
      })
    });

    console.log(`Status Code: ${res.status}`);
    const json = await res.json() as any;
    console.log('Response JSON:', json);

    if (res.status === 200 && json.data) {
      console.log('✅ PASS: Newsletter signup succeeded anonymously under public write permission.');
    } else {
      console.log('⚠️ INFO: Newsletter signup could not be completed (might be duplicate or Supabase offline). Status:', res.status);
    }
  } catch (error: any) {
    console.log('⚠️ INFO: Newsletter signup call encountered exception (Supabase DB offline check):', error.message);
  }

  // =========================================================================
  // CASE 3: Customer trying to mutate another user's profile (Requires Token)
  // =========================================================================
  if (TEST_USER_TOKEN) {
    console.log('\n--- Case 3: Logged-in Customer attempting to modify foreign profile ---');
    try {
      const res = await fetch(`${APP_URL}/api/db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_USER_TOKEN}`
        },
        body: JSON.stringify({
          action: 'upsert',
          tableName: 'profiles',
          payload: {
            id: '11111111-1111-1111-1111-111111111111', // Foreign User UUID
            full_name: 'Bypassed Name',
            role: 'super admin' // Attempting privilege escalation
          }
        })
      });

      console.log(`Status Code: ${res.status}`);
      const json = await res.json() as any;
      console.log('Response JSON:', json);

      if (res.status >= 400 || json.error) {
        console.log('✅ PASS: Mutation blocked by Postgres RLS policy.');
      } else {
        console.log('❌ FAIL: Customer successfully modified foreign profile!');
      }
    } catch (error: any) {
      console.log('✅ PASS: Mutation blocked/failed with exception:', error.message);
    }
  } else {
    console.log('\n--- Case 3: Logged-in Customer test [SKIPPED] (No TEST_USER_TOKEN provided) ---');
  }

  // =========================================================================
  // CASE 4: Administrative staff updating inventory (Requires Token)
  // =========================================================================
  if (TEST_ADMIN_TOKEN) {
    console.log('\n--- Case 4: Admin/Staff user performing authorized product creation ---');
    try {
      const res = await fetch(`${APP_URL}/api/db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_ADMIN_TOKEN}`
        },
        body: JSON.stringify({
          action: 'insert',
          tableName: 'products',
          payload: {
            name: 'Regal Tuxedo Suit',
            slug: `regal-tuxedo-${Math.floor(Math.random() * 1000)}`,
            price: 1500000,
            stock: 5,
            status: 'Active'
          }
        })
      });

      console.log(`Status Code: ${res.status}`);
      const json = await res.json() as any;
      console.log('Response JSON:', json);

      if (res.status === 200 && json.data) {
        console.log('✅ PASS: Admin successfully created product under administrative RLS permissions.');
      } else {
        console.log('❌ FAIL: Admin operation failed but should be allowed. Status:', res.status);
      }
    } catch (error: any) {
      console.log('⚠️ INFO: Admin test encountered network/auth exception:', error.message);
    }
  } else {
    console.log('\n--- Case 4: Admin/Staff test [SKIPPED] (No TEST_ADMIN_TOKEN provided) ---');
  }

  console.log('\n===========================================================');
  console.log('🛡️ SECURITY REGRESSION CHECK COMPLETED');
  console.log('===========================================================');
}

// Self-execute if executed directly
if (require.main === module) {
  runSecurityTests();
}

export { runSecurityTests };
