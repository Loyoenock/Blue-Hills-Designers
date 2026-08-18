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
      throw new ApiError('Forbidden: Only Admin or Super Admin accounts are authorized to delete user profiles.', 403);
    }

    // 2. Enforce Rate Limit (20 user deletions per minute per IP)
    await enforceRateLimit(req, 20, 60000);

    // 3. Input Validation
    const body = await req.json().catch(() => ({}));
    const targetId = (typeof body.userId === 'string' ? body.userId : typeof body.id === 'string' ? body.id : '').trim();

    if (!targetId) {
      throw new ApiError('User ID is required for deletion.', 400);
    }

    // 4. Server-Side Self-Deletion Guard
    if (targetId === caller.id) {
      throw new ApiError('Forbidden: You cannot delete your own account.', 403);
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    // 5. Role Escalation & Authority Rank Guard
    const callerRank = getRoleRank(caller.role);

    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, email, full_name')
      .eq('id', targetId)
      .maybeSingle();

    if (targetProfile && targetProfile.role) {
      const targetRank = getRoleRank(targetProfile.role);
      if (targetRank > callerRank) {
        throw new ApiError(
          `Forbidden: Your role level (${caller.role}) cannot delete a user with higher authority (${targetProfile.role}).`,
          403
        );
      }
    }

    logger.info('Admin deleting user account and auth credentials', {
      adminId: caller.id,
      targetUserId: targetId,
      targetEmail: targetProfile?.email
    });

    // 6. Delete user from auth.users (Supabase Auth)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetId);

    if (authDeleteError) {
      const isNotFound =
        authDeleteError.message?.toLowerCase().includes('not found') ||
        (authDeleteError as any).status === 404 ||
        (authDeleteError as any).code === 'user_not_found';

      if (isNotFound) {
        logger.warn('Auth user was not found during deletion (already removed or orphaned). Proceeding with profile cleanup.', {
          targetUserId: targetId,
          error: authDeleteError.message
        });
      } else {
        logger.error('Failed to delete auth user via Supabase admin', authDeleteError);
        throw new ApiError(authDeleteError.message || 'Failed to delete user authentication record.', 400);
      }
    }

    // 7. Explicit profile delete safety step (in case foreign key cascade did not fire or row was orphaned)
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', targetId);

    if (profileDeleteError) {
      logger.warn('Failed to delete public.profiles row directly (may have already cascaded)', {
        targetUserId: targetId,
        error: profileDeleteError.message
      });
    }

    logger.info('User account deleted successfully from auth and database', { targetUserId: targetId });

    return NextResponse.json({
      success: true,
      message: 'User account and profile deleted successfully.'
    });

  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
