import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, enforceRateLimit, createErrorResponse, logger, validateFields, ApiError } from '@/lib/apiUtils';
import { normalizeRole } from '@/lib/adminBootstrap';
import { getRoleRank } from '@/lib/roleRank';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller & verify admin/staff role
    const caller = await requireAuth(req);
    const callerRole = (caller.role || '').toLowerCase();

    if (!['super admin', 'admin', 'manager'].includes(callerRole)) {
      throw new ApiError('Forbidden: Your authority role level does not permit creating user profiles.', 403);
    }

    // 2. Enforce Rate Limit (20 user creations per minute per IP)
    await enforceRateLimit(req, 20, 60000);

    // 3. Input Validation
    const body = await req.json().catch(() => ({}));
    validateFields(body, {
      email: 'email',
      name: 'string'
    });

    const { name, email, phone, role, password } = body;
    const emailTrimmed = email.trim().toLowerCase();
    const cleanName = name.trim().slice(0, 80);
    const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 25).replace(/[^\d+\-\s()]/g, '') : '';
    const requestedRole = typeof role === 'string' ? role.trim() : 'Customer';
    const rolePair = normalizeRole(requestedRole);

    // 4. Role Escalation Protection:
    // Rank: Super Admin (4) > Admin (3) > Manager (2) > Staff (1) > Customer (0)
    const callerRank = getRoleRank(caller.role);
    const targetRank = getRoleRank(requestedRole);

    if (targetRank > callerRank) {
      throw new ApiError(`Forbidden: Your role level (${caller.role}) cannot assign a higher authority role (${requestedRole}).`, 403);
    }

    // Determine initial password if not provided
    const userPassword = (typeof password === 'string' && password.length >= 6)
      ? password
      : `BHD-${Math.random().toString(36).substring(2, 10)}!`;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    logger.info('Admin creating user account', { createdBy: caller.id, email: emailTrimmed, role: rolePair.display });

    // 5. Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrimmed,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        name: cleanName,
        full_name: cleanName,
        phone: cleanPhone,
        role: rolePair.display
      }
    });

    if (authError || !authData?.user) {
      logger.error('Supabase admin createUser failed', authError);
      throw new ApiError(authError?.message || 'Failed to create authentication user record.', 400);
    }

    const newAuthUser = authData.user;

    // 6. Upsert real profiles row with genuine auth.users UUID
    const profilePayload = {
      id: newAuthUser.id,
      full_name: cleanName,
      email: emailTrimmed,
      phone: cleanPhone,
      role: rolePair.db,
      lifetime_spending: 0,
      reward_points: 0,
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload);

    if (profileError) {
      logger.error('Failed to upsert profiles row for new user, rolling back auth user:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id).catch(() => {});
      throw new ApiError(`Could not save profile record: ${profileError.message}`, 500);
    }

    logger.info('User account & profile created successfully', { userId: newAuthUser.id, email: emailTrimmed });

    return NextResponse.json({
      success: true,
      user: {
        id: newAuthUser.id,
        name: cleanName,
        email: emailTrimmed,
        phone: cleanPhone,
        role: rolePair.display,
        spending: 0,
        rewardsPoints: 0,
        source: 'db',
        temporaryPassword: userPassword
      }
    });

  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
