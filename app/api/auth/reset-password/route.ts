import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, validateFields, ApiError, logger } from '@/lib/apiUtils';

export async function POST(req: NextRequest) {
  try {
    // Enforce rate limit (max 5 password resets per minute per IP)
    enforceRateLimit(req, 5, 60000);

    const body = await req.json().catch(() => ({}));
    validateFields(body, {
      password: 'string'
    });

    const { password } = body;
    if (password.length < 6 || password.length > 100) {
      throw new ApiError('Password must be between 6 and 100 characters in length.', 400);
    }

    // Authenticate the user calling this.
    // Try from the Authorization header, fallback to the cookie
    const authHeader = req.headers.get('Authorization');
    const cookieToken = req.cookies.get('sb-access-token')?.value;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : cookieToken;

    if (!token) {
      throw new ApiError('Unauthenticated. Missing valid security access token.', 401);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new ApiError('Database service is unconfigured.', 500);
    }

    // Retrieve user by their token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new ApiError('Invalid or expired security token. Please request a new recovery link.', 401);
    }

    // Update the password using the admin API on behalf of this user (extremely secure and robust!)
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: password
    });

    if (updateError) {
      throw new ApiError(updateError.message, 400);
    }

    logger.info('Password updated successfully via API', { userId: user.id });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
