import { z } from 'zod';
import { logger } from './apiUtils';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required for AI-powered features'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  APP_URL: z.string().optional(),
  ADMIN_BOOTSTRAP_EMAILS: z.string().optional().refine((val) => {
    if (!val) return true;
    const emails = val.split(',').map((e) => e.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every((email) => emailRegex.test(email));
  }, { message: 'ADMIN_BOOTSTRAP_EMAILS must be a comma-separated list of valid email addresses' }),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_PUBLIC_KEY: z.string().optional(),
  NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: z.string().optional(),
  FLUTTERWAVE_WEBHOOK_SECRET_HASH: z.string().optional(),
  PAYMENT_TEST_MODE: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

export function validateEnv() {
  const envVars = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
    ADMIN_BOOTSTRAP_EMAILS: process.env.ADMIN_BOOTSTRAP_EMAILS,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY,
    NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY,
    FLUTTERWAVE_WEBHOOK_SECRET_HASH: process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH,
    PAYMENT_TEST_MODE: process.env.PAYMENT_TEST_MODE,
    SENTRY_DSN: process.env.SENTRY_DSN,
  };

  const result = envSchema.safeParse(envVars);

  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    logger.warn('Environment validation check failed:', {
      errors: fieldErrors,
      stage: process.env.NODE_ENV,
    });
    return {
      success: false,
      errors: fieldErrors,
      data: envVars,
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

// Auto-run validation check on import in server-side/api contexts
if (typeof window === 'undefined') {
  validateEnv();
}
