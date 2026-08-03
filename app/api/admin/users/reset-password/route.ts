import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, enforceRateLimit, createErrorResponse, logger, validateFields, ApiError } from '@/lib/apiUtils';
import { getRoleRank } from '@/lib/roleRank';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller & verify Admin / Super Admin role
    const caller = await requireAuth(req);
    const callerRole = (caller.role || '').toLowerCase();

    if (!['super admin', 'admin'].includes(callerRole)) {
      throw new ApiError('Forbidden: Only Admin or Super Admin accounts are authorized to reset user passwords.', 403);
    }

    // 2. Enforce Rate Limit (10 password resets per minute per IP)
    await enforceRateLimit(req, 10, 60000);

    // 3. Input Validation
    const body = await req.json().catch(() => ({}));
    validateFields(body, {
      userId: 'string'
    });

    const { userId, password } = body;
    const cleanUserId = userId.trim();

    if (cleanUserId === caller.id) {
      throw new ApiError('Forbidden: You cannot reset your own password through the admin panel.', 403);
    }

    if (typeof password === 'string' && password.length > 0) {
      if (password.length < 6 || password.length > 100) {
        throw new ApiError('Password must be between 6 and 100 characters long.', 400);
      }
    }

    const finalPassword = (typeof password === 'string' && password.trim().length >= 6)
      ? password.trim()
      : `BHD-${Math.random().toString(36).substring(2, 10)}!`;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    // 4. Role Escalation & Rank Guard
    const callerRank = getRoleRank(caller.role);

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', cleanUserId)
      .maybeSingle();

    if (targetProfile && targetProfile.role) {
      const targetRank = getRoleRank(targetProfile.role);
      if (targetRank >= callerRank) {
        throw new ApiError(`Forbidden: Your role level (${caller.role}) cannot reset the password of a user with equal or higher authority (${targetProfile.role}).`, 403);
      }
    }

    logger.info('Admin resetting user password', { adminId: caller.id, targetUserId: cleanUserId });

    // 5. Update user password in auth.users
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(cleanUserId, {
      password: finalPassword
    });

    if (updateError) {
      logger.error('Failed to reset user password via Supabase admin', updateError);
      throw new ApiError(updateError?.message || 'Failed to update user password.', 400);
    }

    return NextResponse.json({
      success: true,
      temporaryPassword: finalPassword
    });

  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
