import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from './supabase';
import { checkRateLimit, RateLimitResult } from './rateLimit';
import { isBootstrapAdminEmail } from './adminBootstrap';

interface RoleCacheRecord {
  role: string;
  expiresAt: number;
}

/**
 * Short-TTL in-memory cache for user role profile lookups.
 * TTL: 60 seconds (60,000 ms).
 */
const ROLE_CACHE_TTL_MS = 60 * 1000;
const roleCacheMap = new Map<string, RoleCacheRecord>();

export function clearRoleCache(): void {
  roleCacheMap.clear();
}

// Clean up expired role cache entries periodically to prevent memory leaks
if (typeof global !== 'undefined') {
  const intervalId = (global as any).__roleCacheCleanupIntervalApiUtils;
  if (intervalId) {
    clearInterval(intervalId);
  }
  (global as any).__roleCacheCleanupIntervalApiUtils = setInterval(() => {
    const now = Date.now();
    for (const [userId, record] of roleCacheMap.entries()) {
      if (now > record.expiresAt) {
        roleCacheMap.delete(userId);
      }
    }
  }, 5 * 60 * 1000);
}

// ==========================================
// 1. RESPONSE TYPING
// ==========================================

export interface StandardErrorResponse {
  error: string;
}

export interface AuthRegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    phone: string;
    role: string;
  };
  error?: string;
}

export interface StorageUploadResponse {
  path: string;
}

export interface StorageSignedUrlResponse {
  signedUrl: string;
}

export interface StorageSignedUrlsResponse {
  signedUrls: Array<{ path: string; signedUrl: string }>;
}

export interface DbOperationResponse {
  data?: any;
  message?: string;
  success?: boolean;
}

export interface GeminiChatResponse {
  text: string;
  simulated?: boolean;
  error?: string;
}

// ==========================================
// 2. STRUCTURED LOGGING & OPTIONAL SENTRY
// ==========================================

async function captureSentryError(message: string, err?: any, context?: Record<string, any>) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    const match = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/);
    if (!match) return;

    const [, publicKey, host, projectId] = match;
    const storeUrl = `https://${host}/api/${projectId}/store/`;

    const errorObj = err instanceof Error ? err : null;
    const errorMsg = errorObj ? errorObj.message : typeof err === 'string' ? err : JSON.stringify(err || '');

    const payload = {
      event_id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)).replace(/-/g, ''),
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      platform: 'node',
      level: 'error',
      logger: 'apiUtils',
      message: {
        formatted: message ? `${message}${errorMsg ? `: ${errorMsg}` : ''}` : errorMsg || 'Server Error',
      },
      exception: errorObj
        ? {
            values: [
              {
                type: errorObj.name || 'Error',
                value: errorObj.message,
                stacktrace: errorObj.stack
                  ? {
                      frames: errorObj.stack
                        .split('\n')
                        .slice(1)
                        .map((line) => ({ filename: line.trim() })),
                    }
                  : undefined,
              },
            ],
          }
        : undefined,
      extra: {
        ...(context || {}),
        rawError: !errorObj && err ? err : undefined,
      },
    };

    fetch(storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${publicKey}, sentry_client=custom-logger/1.0`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Ignore background fetch errors
    });
  } catch {
    // Silent catch so logging never throws
  }
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        ...context,
      })
    );
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        ...context,
      })
    );
  },
  error: (message: string, err?: any, context?: Record<string, any>) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
        ...context,
      })
    );

    if (process.env.SENTRY_DSN) {
      try {
        captureSentryError(message, err, context);
      } catch {
        // Silent catch so Sentry capture failures never throw
      }
    }
  },
};

// ==========================================
// 3. CENTRALIZED ERROR HANDLING
// ==========================================

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function createErrorResponse(req: NextRequest, error: any): NextResponse {
  const path = req.nextUrl.pathname;
  let message = 'An unexpected server error occurred.';
  let status = 500;
  let headers: Record<string, string> = {};

  if (error instanceof ApiError) {
    message = error.message;
    status = error.statusCode;
    if (status === 429 && error.details) {
      const details = error.details as RateLimitResult;
      headers = {
        'X-RateLimit-Limit': String(details.limit),
        'X-RateLimit-Remaining': String(details.remaining),
        'X-RateLimit-Reset': String(details.reset),
      };
    }
  } else if (error instanceof Error) {
    message = error.message;
    status = 400; // Client-side logic/validation errors default to 400
  }

  if (status >= 500) {
    logger.error(`API Error in ${path}`, error, { path, status });
  } else {
    logger.warn(`API Client Error/Warning in ${path}: ${message}`, { path, status });
  }

  if (path.includes('/api/auth/register') || path.includes('/api/auth/login')) {
    return NextResponse.json({ success: false, error: message }, { status, headers });
  }

  if (path.includes('/api/health')) {
    return NextResponse.json({ status: 'unhealthy', error: message }, { status, headers });
  }

  return NextResponse.json({ error: message }, { status, headers });
}

// ==========================================
// 4. REQUEST VALIDATION
// ==========================================

export function validateFields(
  body: any,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'any'>
) {
  if (!body || typeof body !== 'object') {
    throw new ApiError('Invalid request payload. Expected a JSON object.', 400);
  }

  for (const [key, type] of Object.entries(schema)) {
    const value = body[key];
    if (value === undefined || value === null) {
      throw new ApiError(`Field "${key}" is required.`, 400);
    }

    if (type === 'string' && typeof value !== 'string') {
      throw new ApiError(`Field "${key}" must be a string.`, 400);
    }
    if (type === 'number' && typeof value !== 'number') {
      throw new ApiError(`Field "${key}" must be a number.`, 400);
    }
    if (type === 'boolean' && typeof value !== 'boolean') {
      throw new ApiError(`Field "${key}" must be a boolean.`, 400);
    }
    if (type === 'array' && !Array.isArray(value)) {
      throw new ApiError(`Field "${key}" must be an array.`, 400);
    }
    if (type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      throw new ApiError(`Field "${key}" must be an object.`, 400);
    }
    if (type === 'email') {
      if (typeof value !== 'string') {
        throw new ApiError(`Field "${key}" must be a valid email string.`, 400);
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value.trim())) {
        throw new ApiError(`Field "${key}" is not a valid email address.`, 400);
      }
    }
  }
}

// ==========================================
// 5. AUTHENTICATION MIDDLEWARE
// ==========================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  metadata: Record<string, any>;
}

export async function authenticate(req: NextRequest): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  let userRole: string;

  if (user.email && isBootstrapAdminEmail(user.email)) {
    userRole = 'Super Admin';
  } else {
    const now = Date.now();
    const cached = roleCacheMap.get(user.id);
    if (cached && now < cached.expiresAt) {
      userRole = cached.role;
    } else {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile && profile.role) {
          userRole = profile.role;
        } else {
          userRole = user.user_metadata?.role || 'Customer';
        }
      } catch (profileErr) {
        logger.error('[AUTHENTICATE] Profile DB lookup failed, falling back to user_metadata:', profileErr);
        userRole = user.user_metadata?.role || 'Customer';
      }

      roleCacheMap.set(user.id, {
        role: userRole,
        expiresAt: now + ROLE_CACHE_TTL_MS,
      });
    }
  }

  return {
    id: user.id,
    email: user.email || '',
    role: userRole,
    metadata: user.user_metadata || {},
  };
}

export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await authenticate(req);
  if (!user) {
    throw new ApiError('Authentication token is missing, invalid, or expired.', 401);
  }
  return user;
}

// ==========================================
// 6. RATE LIMITING HELPERS
// ==========================================

export async function enforceRateLimit(req: NextRequest, limit = 60, windowMs = 60000): Promise<RateLimitResult> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const path = req.nextUrl.pathname;
  const rateLimitKey = `${ip}:${path}`;
  const result = await checkRateLimit(rateLimitKey, limit, windowMs);
  if (!result.success) {
    throw new ApiError(`Too many requests. Please try again in ${result.reset} seconds.`, 429, result);
  }
  return result;
}
