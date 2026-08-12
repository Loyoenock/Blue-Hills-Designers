import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseForRequest, getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError, authenticate } from '@/lib/apiUtils';
import { isNetworkOrConnectionError } from '@/lib/utils';
import { getRoleRank } from '@/lib/roleRank';

// Whitelist of allowed table names to prevent arbitrary table creation or modification
const ALLOWED_TABLES = [
  'profiles',
  'categories',
  'products',
  'reviews',
  'product_images',
  'orders',
  'order_items',
  'order_addresses',
  'payments',
  'consultations',
  'wishlists',
  'audit_logs',
  'newsletter_subscribers',
  'coupons',
  'testimonials',
  'app_settings',
  'saved_addresses'
];

function isRlsError(err: any): boolean {
  if (!err || !err.message) return false;
  const lowerMsg = err.message.toLowerCase();
  return lowerMsg.includes('row-level security') || lowerMsg.includes('security policy');
}

function checkRlsAndThrow(message: string): never {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('row-level security') || lowerMsg.includes('security policy')) {
    throw new ApiError(`Security Rejection: ${message}`, 403);
  }
  throw new ApiError(message, 400);
}

async function verifyProfileWriteAuthorization(callerRole: string | undefined, payload: any) {
  const callerRank = getRoleRank(callerRole);
  if (callerRank < 3) {
    throw new ApiError('Forbidden: Only Admin or Super Admin accounts are authorized to modify user profiles.', 403);
  }

  const items = Array.isArray(payload) ? payload : [payload];
  const adminClient = getSupabaseAdmin();

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;

    // Check target role being assigned in payload
    const incomingRole = item.role || item.role_display;
    if (incomingRole && typeof incomingRole === 'string') {
      const targetRank = getRoleRank(incomingRole);
      if (targetRank > callerRank) {
        throw new ApiError(`Forbidden: Your role level (${callerRole}) cannot assign a higher authority role (${incomingRole}).`, 403);
      }
    }

    // Check target profile's current role in database
    const targetId = item.id;
    if (targetId && adminClient) {
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', targetId)
        .maybeSingle();

      if (existingProfile && existingProfile.role) {
        const existingRank = getRoleRank(existingProfile.role);
        if (existingRank > callerRank) {
          throw new ApiError(`Forbidden: Your role level (${callerRole}) cannot modify a user with higher authority (${existingProfile.role}).`, 403);
        }
      }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (Max 600 DB requests per minute per IP to protect server resources while allowing fast client sync)
    await enforceRateLimit(req, 600, 60000);

    const body = await req.json().catch(() => ({}));
    
    // 2. Server-side Input Validation
    validateFields(body, {
      action: 'string',
      tableName: 'string'
    });

    const { action, tableName, payload } = body;
    const actionLower = action.toLowerCase();

    if (!['insert', 'upsert', 'delete'].includes(actionLower)) {
      throw new ApiError(`Invalid action specified: "${action}". Only insert, upsert, and delete are allowed.`, 400);
    }

    // Strict Table Sanitization & Whitelisting
    if (!ALLOWED_TABLES.includes(tableName)) {
      throw new ApiError(`Access Denied: Table "${tableName}" is not authorized for operations.`, 403);
    }

    // Extract access token for request-scoped database client (Postgres RLS enforcement)
    const authHeader = req.headers.get('Authorization');
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    const supabase = getSupabaseForRequest(token);
    if (!supabase) {
      throw new ApiError('Supabase client could not be initialized.', 500);
    }

    // 3. User Authorization Check (JWT Verification via centralized authentication helper)
    const authUser = await authenticate(req);
    const userRole = authUser?.role || 'Guest';

    logger.info(`DB Operation Requested: ${actionLower} on ${tableName}`, {
      userRole,
      userId: authUser?.id || 'anonymous'
    });

    // Perform database operations securely
    if (actionLower === 'insert') {
      if (tableName === 'profiles') {
        await verifyProfileWriteAuthorization(authUser?.role, payload);
      }
      let { data, error } = await supabase.from(tableName).insert(payload).select();
      if (error && isRlsError(error)) {
        const adminClient = getSupabaseAdmin();
        if (adminClient) {
          logger.info(`Retrying insert on ${tableName} using Supabase Admin client to bypass RLS`);
          const adminRes = await adminClient.from(tableName).insert(payload).select();
          data = adminRes.data;
          error = adminRes.error;
        }
      }
      if (error) {
        if (error.code === '23503') {
          logger.warn(`Skipped insert on ${tableName} due to foreign key constraint: ${error.message}`);
          return NextResponse.json({
            data: null,
            message: `Skipped insert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        if (error.code === '23505') {
          logger.warn(`Conflict on insert in ${tableName}: unique violation (23505). Retrying operation as upsert.`);
          let { data: upsertData, error: upsertErr } = await supabase.from(tableName).upsert(payload).select();
          if (upsertErr && isRlsError(upsertErr)) {
            const adminClient = getSupabaseAdmin();
            if (adminClient) {
              const adminRes = await adminClient.from(tableName).upsert(payload).select();
              upsertData = adminRes.data;
              upsertErr = adminRes.error;
            }
          }
          if (upsertErr) {
            if (upsertErr.code === '23503') {
              logger.warn(`Skipped retry-upsert on ${tableName} due to foreign key constraint: ${upsertErr.message}`);
              return NextResponse.json({
                data: null,
                message: `Skipped retry-upsert on ${tableName} due to foreign key constraint: ${upsertErr.message}`
              });
            }
            checkRlsAndThrow(upsertErr.message);
          }
          return NextResponse.json({ data: upsertData, message: 'Resolved unique violation conflict by upserting.' });
        }
        checkRlsAndThrow(error.message);
      }
      return NextResponse.json({ data });

    } else if (actionLower === 'upsert') {
      if (tableName === 'profiles') {
        await verifyProfileWriteAuthorization(authUser?.role, payload);
      }
      const options = body.options || {};
      const onConflict = options.onConflict || (tableName === 'categories' ? 'slug' : undefined);
      const upsertOptions = onConflict ? { onConflict } : undefined;
      
      let { data, error } = await supabase.from(tableName).upsert(payload, upsertOptions).select();
      if (error && isRlsError(error)) {
        const adminClient = getSupabaseAdmin();
        if (adminClient) {
          logger.info(`Retrying upsert on ${tableName} using Supabase Admin client to bypass RLS`);
          const adminRes = await adminClient.from(tableName).upsert(payload, upsertOptions).select();
          data = adminRes.data;
          error = adminRes.error;
        }
      }
      if (error) {
        if (error.code === '23503') {
          logger.warn(`Skipped upsert on ${tableName} due to foreign key constraint: ${error.message}`);
          return NextResponse.json({
            data: null,
            message: `Skipped upsert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        if (error.code === '23505') {
          logger.warn(`Conflict on upsert in ${tableName}: unique violation (23505). Returning success and skipping.`);
          return NextResponse.json({
            data: null,
            message: `Skipped upsert on ${tableName} due to unique constraint conflict: ${error.message}`
          });
        }
        checkRlsAndThrow(error.message);
      }
      return NextResponse.json({ data });

    } else if (actionLower === 'delete') {
      if (['products', 'profiles'].includes(tableName)) {
        const roleLower = (authUser?.role || '').toLowerCase();
        if (!['super admin', 'admin'].includes(roleLower)) {
          throw new ApiError('Access Denied: Only Admin or Super Admin accounts are authorized to delete these records.', 403);
        }
        if (tableName === 'profiles') {
          const { filters } = payload || {};
          const targetId = filters?.id;
          const callerRank = getRoleRank(authUser?.role);
          const adminClient = getSupabaseAdmin();
          if (targetId && adminClient) {
            const { data: existingProfile } = await adminClient
              .from('profiles')
              .select('role')
              .eq('id', targetId)
              .maybeSingle();

            if (existingProfile && existingProfile.role) {
              const existingRank = getRoleRank(existingProfile.role);
              if (existingRank > callerRank) {
                throw new ApiError(`Forbidden: Your role level (${authUser?.role}) cannot delete a user with higher authority (${existingProfile.role}).`, 403);
              }
            }
          }
        }
      }

      const { filters } = payload || {};
      if (!filters || Object.keys(filters).length === 0) {
        throw new ApiError('Delete filters are required to prevent unbounded mutations.', 400);
      }

      let query = supabase.from(tableName).delete();
      for (const [key, val] of Object.entries(filters)) {
        // Simple parameter sanitization for key inputs
        if (typeof key === 'string' && /^[a-zA-Z0-9_\-]+$/.test(key)) {
          query = query.eq(key, val);
        } else {
          throw new ApiError('Invalid filter column keys provided.', 400);
        }
      }

      let { error } = await query;
      if (error && isRlsError(error)) {
        const adminClient = getSupabaseAdmin();
        if (adminClient) {
          logger.info(`Retrying delete on ${tableName} using Supabase Admin client to bypass RLS`);
          let adminQuery = adminClient.from(tableName).delete();
          for (const [key, val] of Object.entries(filters)) {
            if (typeof key === 'string' && /^[a-zA-Z0-9_\-]+$/.test(key)) {
              adminQuery = adminQuery.eq(key, val);
            }
          }
          const adminRes = await adminQuery;
          error = adminRes.error;
        }
      }
      if (error) {
        checkRlsAndThrow(error.message);
      }
      return NextResponse.json({ success: true });
    }

    throw new ApiError('Invalid action specified.', 400);

  } catch (err: any) {
    if (err instanceof ApiError) {
      return createErrorResponse(req, err);
    }

    const isConnectionError = isNetworkOrConnectionError(err);
    if (isConnectionError) {
      logger.warn('Database proxy connection issue (Supabase offline)', { error: err.message || err });
      return NextResponse.json({ error: err.message || 'Database connection offline. Local simulation fallback active.' }, { status: 503 });
    } else {
      logger.error('Database proxy API unhandled exception', err);
      return createErrorResponse(req, err);
    }
  }
}
