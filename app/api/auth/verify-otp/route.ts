import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, validateFields, ApiError, logger } from '@/lib/apiUtils';

export async function POST(req: NextRequest) {
  try {
    // Enforce rate limit (max 10 OTP attempts per minute per IP)
    await enforceRateLimit(req, 10, 60000);

    const body = await req.json().catch(() => ({}));
    validateFields(body, {
      email: 'email',
      token: 'string'
    });

    const { email, token } = body;
    const emailTrimmed = email.trim().toLowerCase();

    logger.info('OTP verification request received', { email: emailTrimmed });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new ApiError('Database service is unconfigured.', 500);
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: emailTrimmed,
      token,
      type: 'signup'
    });

    if (error) {
      logger.warn('OTP verification failure', { email: emailTrimmed, error: error.message });
      throw new ApiError(error.message, 400);
    }

    const session = data?.session;
    const user = data?.user;

    if (!user) {
      throw new ApiError('Verification succeeded but user details were not returned.', 500);
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || emailTrimmed.split('@')[0].toUpperCase(),
        phone: user.user_metadata?.phone || '',
        role: user.user_metadata?.role || 'Customer'
      },
      session: session ? {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in
      } : null
    });

    // If verification automatically signed the user in, set the cookies
    if (session) {
      const isSecure = req.nextUrl.protocol === 'https:';
      const cookieOptions = {
        path: '/',
        maxAge: session.expires_in || 3600,
        sameSite: 'lax' as const,
        secure: isSecure
      };

      response.cookies.set('sb-access-token', session.access_token, cookieOptions);
      response.cookies.set('sb-refresh-token', session.refresh_token, {
        ...cookieOptions,
        maxAge: 604800 // 7 days
      });
    }

    logger.info('OTP verification successful', { userId: user.id, email: emailTrimmed });
    return response;
  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
