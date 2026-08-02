import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError } from '@/lib/apiUtils';
import { isNetworkOrConnectionError } from '@/lib/utils';
import { isBootstrapAdminEmail, normalizeRole } from '@/lib/adminBootstrap';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting check (max 10 registration requests per minute per IP)
    await enforceRateLimit(req, 10, 60000);

    const body = await req.json().catch(() => ({}));
    
    // 2. Input Validation
    validateFields(body, {
      email: 'email',
      password: 'string'
    });

    const { name, email, phone, password } = body;
    const emailTrimmed = email.trim().toLowerCase();

    if (password.length < 6 || password.length > 100) {
      throw new ApiError('Password must be between 6 and 100 characters in length.', 400);
    }

    if (emailTrimmed.length > 150) {
      throw new ApiError('Please provide a valid email address.', 400);
    }

    // 3. Sanitization to mitigate malicious injections
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 80) : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 25).replace(/[^\d+\-\s()]/g, '') : '';

    // 4. Role Escalation Protection: Public signups can ONLY be 'Customer'.
    // Only emails configured in ADMIN_BOOTSTRAP_EMAILS gain 'Super Admin' privilege during sign up.
    const resolvedRole = isBootstrapAdminEmail(emailTrimmed) ? 'Super Admin' : 'Customer';
    const rolePair = normalizeRole(resolvedRole);

    logger.info('Attempting new profile registration', { email: emailTrimmed, role: rolePair.display });

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    let authUser = null;
    let fallbackToLocal = false;
    let errorMessage = '';

    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: emailTrimmed,
        password,
        email_confirm: true,
        user_metadata: {
          name: cleanName,
          full_name: cleanName,
          phone: cleanPhone,
          role: rolePair.display
        }
      });

      if (error) {
        errorMessage = error.message;
        const isNetworkOrAuthError = isNetworkOrConnectionError(error);

        if (errorMessage.toLowerCase().includes('already registered') || errorMessage.toLowerCase().includes('already been registered')) {
          if (isBootstrapAdminEmail(emailTrimmed) && supabaseAdmin) {
            try {
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === emailTrimmed);
              if (existingUser) {
                const { data: updatedData } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                  password,
                  user_metadata: {
                    name: cleanName || (existingUser.user_metadata?.name as string) || 'SUPER ADMIN',
                    full_name: cleanName || (existingUser.user_metadata?.full_name as string) || 'SUPER ADMIN',
                    phone: cleanPhone || (existingUser.user_metadata?.phone as string) || '',
                    role: rolePair.display
                  }
                });
                if (updatedData?.user) {
                  authUser = updatedData.user;
                  logger.info('Updated password and role for existing bootstrap admin on register', { email: emailTrimmed });
                }
              }
            } catch (updErr: any) {
              logger.warn('Failed to update existing bootstrap admin user during register:', { error: updErr?.message || String(updErr) });
            }
          }

          if (!authUser) {
            logger.warn('Registration attempt with existing email:', { email: emailTrimmed });
            throw new ApiError('An account with this email address has already been registered. Please sign in instead.', 400);
          }
        } else if (isNetworkOrAuthError) {
          logger.warn('Supabase service offline/unreachable during registration.', { error: errorMessage });
          fallbackToLocal = true;
        } else {
          logger.warn('Supabase admin createUser validation error:', { error: error.message });
          throw new ApiError(error.message, 400);
        }
      } else {
        authUser = data?.user;
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      errorMessage = err.message || '';
      if (isNetworkOrConnectionError(err)) {
        logger.warn('Network exception during Supabase admin createUser', { error: errorMessage });
        fallbackToLocal = true;
      } else {
        logger.error('Exception during Supabase admin createUser', err);
        throw err;
      }
    }

    if (fallbackToLocal || !authUser) {
      logger.warn('Registration failed due to DB/Network connection issue', { email: emailTrimmed });
      throw new ApiError('We could not complete your registration due to a temporary service issue. Please try again in a moment.', 503);
    }

    logger.info('User registration completed successfully', { userId: authUser.id, email: emailTrimmed });

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        name: cleanName,
        phone: cleanPhone,
        role: rolePair.display
      }
    });
  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
