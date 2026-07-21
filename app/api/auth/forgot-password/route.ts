import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, validateFields, ApiError, logger } from '@/lib/apiUtils';

export async function POST(req: NextRequest) {
  try {
    // Enforce rate limit (max 5 reset email dispatches per minute per IP)
    enforceRateLimit(req, 5, 60000);

    const body = await req.json().catch(() => ({}));
    validateFields(body, {
      email: 'email'
    });

    const { email } = body;
    const emailTrimmed = email.trim().toLowerCase();

    logger.info('Forgot Password Request received', { email: emailTrimmed });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new ApiError('Database service is unconfigured.', 500);
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const { error } = await supabase.auth.resetPasswordForEmail(emailTrimmed, {
      redirectTo: `${origin}/reset-password`
    });

    if (error) {
      logger.error('Failed to trigger reset password transmission', error);
      throw new ApiError(error.message, 400);
    }

    logger.info('Forgot Password link dispatched successfully', { email: emailTrimmed });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
