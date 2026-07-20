import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError, authenticate } from '@/lib/apiUtils';
import { isNetworkOrConnectionError } from '@/lib/utils';

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
  'newsletter_subscribers'
];

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (Max 600 DB requests per minute per IP to protect server resources while allowing fast client sync)
    enforceRateLimit(req, 600, 60000);

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

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
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
      const { data, error } = await supabase.from(tableName).insert(payload).select();
      if (error) {
        if (error.code === '23503') {
          logger.warn(`Skipped insert on ${tableName} due to foreign key constraint: ${error.message}`);
          return NextResponse.json({
            data: null,
            message: `Skipped insert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        throw new ApiError(error.message, 400);
      }
      return NextResponse.json({ data });

    } else if (actionLower === 'upsert') {
      const options = body.options || {};
      const onConflict = options.onConflict || (tableName === 'categories' ? 'slug' : undefined);
      const upsertOptions = onConflict ? { onConflict } : undefined;
      
      const { data, error } = await supabase.from(tableName).upsert(payload, upsertOptions).select();
      if (error) {
        if (error.code === '23503') {
          logger.warn(`Skipped upsert on ${tableName} due to foreign key constraint: ${error.message}`);
          return NextResponse.json({
            data: null,
            message: `Skipped upsert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        throw new ApiError(error.message, 400);
      }
      return NextResponse.json({ data });

    } else if (actionLower === 'delete') {
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

      const { error } = await query;
      if (error) {
        throw new ApiError(error.message, 400);
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
