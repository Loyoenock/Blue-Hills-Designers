import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuthClient } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, validateFields, ApiError, logger } from '@/lib/apiUtils';
import { isBootstrapAdminEmail } from '@/lib/adminBootstrap';

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailTrimmed,
      password
    });

    if (error) {
      logger.warn('API Login Failure', { email: emailTrimmed, error: error.message });
      throw new ApiError(error.message, (error as any).status || 400);
    }

    const session = data?.session;
    const user = data?.user;

    if (!session || !user) {
      throw new ApiError('Login succeeded but session or user details were missing.', 500);
    }

    // Capitalize user role if found in metadata
    let userRole = user.user_metadata?.role || 'Customer';
    if (isBootstrapAdminEmail(emailTrimmed)) {
      userRole = 'Super Admin';
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
    const isSecure = req.nextUrl.protocol === 'https:';
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
