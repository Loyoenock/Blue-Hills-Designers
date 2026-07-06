import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
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
    // 1. Rate Limiting Check (Max 120 DB requests per minute per IP to protect server resources)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimitRes = checkRateLimit(ip, 120, 60000);
    if (!rateLimitRes.success) {
      return NextResponse.json(
        { error: `Too many database operations. Please try again in ${rateLimitRes.reset} seconds.` },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitRes.limit),
            'X-RateLimit-Remaining': String(rateLimitRes.remaining),
            'X-RateLimit-Reset': String(rateLimitRes.reset)
          }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, tableName, payload } = body;

    // 2. Server-side Input Validation
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Database action parameter is required and must be a string.' }, { status: 400 });
    }
    
    if (!tableName || typeof tableName !== 'string') {
      return NextResponse.json({ error: 'Database tableName parameter is required and must be a string.' }, { status: 400 });
    }

    const actionLower = action.toLowerCase();
    if (!['insert', 'upsert', 'delete'].includes(actionLower)) {
      return NextResponse.json({ error: `Invalid action specified: "${action}". Only insert, upsert, and delete are allowed.` }, { status: 400 });
    }

    // Strict Table Sanitization & Whitelisting
    if (!ALLOWED_TABLES.includes(tableName)) {
      return NextResponse.json({ error: `Access Denied: Table "${tableName}" is not authorized for operations.` }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase admin client could not be initialized' },
        { status: 500 }
      );
    }

    // 3. User Authorization Check (JWT Verification via Bearer token in request header)
    const authHeader = req.headers.get('Authorization');
    let authorizedUser = null;
    let userRole = 'Guest';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (!authErr && user) {
          authorizedUser = user;
          userRole = user.user_metadata?.role || 'Customer';
        }
      } catch (err) {
        console.warn('DB Route Auth Verification warning:', err);
      }
    }

    // Role-based Access Control
    // Sensitive administrative tables can only be modified by Super Admins, Admins, Managers, or Staff.
    const isAdminTable = ['categories', 'products', 'audit_logs', 'payments'].includes(tableName);
    if (isAdminTable) {
      const isElevatedRole = ['Super Admin', 'Admin', 'Manager', 'Staff'].includes(userRole);
      
      // If Supabase has been configured with real keys on the server, enforce role checks
      const hasRealKeys = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY !== 'your-service-role-key-here';
      if (hasRealKeys && !isElevatedRole) {
        return NextResponse.json(
          { error: `Unauthorized: Elevated administrative credentials required for table "${tableName}".` },
          { status: 403 }
        );
      }
    }

    // Perform database operations securely
    if (actionLower === 'insert') {
      const { data, error } = await supabase.from(tableName).insert(payload).select();
      if (error) {
        if (error.code === '23503') {
          return NextResponse.json({
            data: null,
            message: `Skipped insert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        return NextResponse.json({ error: error.message || error }, { status: 400 });
      }
      return NextResponse.json({ data });

    } else if (actionLower === 'upsert') {
      const { data, error } = await supabase.from(tableName).upsert(payload).select();
      if (error) {
        if (error.code === '23503') {
          return NextResponse.json({
            data: null,
            message: `Skipped upsert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        return NextResponse.json({ error: error.message || error }, { status: 400 });
      }
      return NextResponse.json({ data });

    } else if (actionLower === 'delete') {
      const { filters } = payload || {};
      if (!filters || Object.keys(filters).length === 0) {
        return NextResponse.json({ error: 'Delete filters are required to prevent unbounded mutations' }, { status: 400 });
      }

      let query = supabase.from(tableName).delete();
      for (const [key, val] of Object.entries(filters)) {
        // Simple parameter sanitization for key inputs
        if (typeof key === 'string' && /^[a-zA-Z0-9_\-]+$/.test(key)) {
          query = query.eq(key, val);
        } else {
          return NextResponse.json({ error: 'Invalid filter column keys provided.' }, { status: 400 });
        }
      }

      const { error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message || error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });

  } catch (err: any) {
    const isConnectionError = isNetworkOrConnectionError(err);

    if (isConnectionError) {
      console.warn('Database proxy connection issue (Supabase offline):', err.message || 'Failed to fetch');
    } else {
      console.error('Database proxy API error:', err);
    }
    return NextResponse.json({ error: err.message || 'Internal server error occurred while syncing records.' }, { status: 500 });
  }
}
