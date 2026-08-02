import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthClient, getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, validateFields, ApiError, logger } from '@/lib/apiUtils';
import { isBootstrapAdminEmail, toDisplayRole } from '@/lib/adminBootstrap';

export async function POST(req: NextRequest) {
  try {
    // Enforce rate limit (max 15 login attempts per minute per IP)
    await enforceRateLimit(req, 15, 60000);

    const body = await req.json().catch(() => ({}));
    validateFields(body, {
      email: 'email',
      password: 'string'
    });

    const { email, password } = body;
    const emailTrimmed = email.trim().toLowerCase();

    logger.info('API Login Request received', { email: emailTrimmed });

    const supabase = getSupabaseAuthClient();
    if (!supabase) {
      throw new ApiError('Authentication is not configured (missing Supabase URL or anon key).', 503);
    }

    let authRes = await supabase.auth.signInWithPassword({
      email: emailTrimmed,
      password
    });

    if (authRes.error && isBootstrapAdminEmail(emailTrimmed)) {
      logger.info('Attempting auto-provisioning for uncreated bootstrap admin login', { email: emailTrimmed });
      const defaultAdminRole = emailTrimmed.includes('manager') || emailTrimmed.includes('patricia')
        ? 'Manager'
        : emailTrimmed.includes('staff') || emailTrimmed.includes('moses')
        ? 'Staff'
        : 'Super Admin';

      try {
        const supabaseAdmin = getSupabaseAdmin();
        if (supabaseAdmin) {
          const { data: newUserData } = await supabaseAdmin.auth.admin.createUser({
            email: emailTrimmed,
            password,
            email_confirm: true,
            user_metadata: {
              name: emailTrimmed.split('@')[0].toUpperCase(),
              full_name: defaultAdminRole,
              role: defaultAdminRole
            }
          });

          if (newUserData?.user) {
            try {
              await supabaseAdmin.from('profiles').upsert({
                id: newUserData.user.id,
                email: emailTrimmed,
                full_name: defaultAdminRole,
                role: defaultAdminRole.toLowerCase(),
                is_active: true
              });
            } catch (_) {}

            // Retry sign in after initial auto-creation
            authRes = await supabase.auth.signInWithPassword({
              email: emailTrimmed,
              password
            });
          }
        }
      } catch (adminErr: any) {
        logger.warn('Admin bootstrap auto-provisioning attempt failed:', { error: adminErr?.message || String(adminErr) });
      }
    }

    if (authRes.error) {
      logger.warn('API Login Failure', { email: emailTrimmed, error: authRes.error.message });
      const statusCode = (authRes.error as any).status === 400 || authRes.error.message?.toLowerCase().includes('invalid login credentials')
        ? 401
        : ((authRes.error as any).status || 401);
      throw new ApiError(authRes.error.message, statusCode);
    }

    const session = authRes.data?.session;
    const user = authRes.data?.user;

    if (!session || !user) {
      throw new ApiError('Login succeeded but session or user details were missing.', 500);
    }

    // Capitalize user role if found in metadata
    let userRole = toDisplayRole(user.user_metadata?.role);
    if (isBootstrapAdminEmail(emailTrimmed)) {
      userRole = emailTrimmed.includes('manager') || emailTrimmed.includes('patricia')
        ? 'Manager'
        : emailTrimmed.includes('staff') || emailTrimmed.includes('moses')
        ? 'Staff'
        : 'Super Admin';
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || emailTrimmed.split('@')[0].toUpperCase(),
        phone: user.user_metadata?.phone || '',
        role: userRole
      },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in
      }
    });

    // Set HTTP-only, secure, lax cookies server-side
    const isSecure =
      req.nextUrl.protocol === 'https:' ||
      req.headers.get('x-forwarded-proto') === 'https';
    const cookieOptions = {
      path: '/',
      maxAge: session.expires_in || 3600,
      sameSite: 'lax' as const,
      secure: isSecure,
      httpOnly: true
    };

    response.cookies.set('sb-access-token', session.access_token, cookieOptions);
    response.cookies.set('sb-refresh-token', session.refresh_token, {
      ...cookieOptions,
      maxAge: 604800 // 7 days
    });

    logger.info('API Login successful', { userId: user.id, email: emailTrimmed });
    return response;
  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
