import { z } from 'zod';
import { logger } from './apiUtils';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required for AI-powered features'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  APP_URL: z.string().optional(),
});

export function validateEnv() {
  const envVars = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL,
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
