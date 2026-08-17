import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const log = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

/**
 * NOTE: Partial or prefix matching was a prior security vulnerability and must NEVER be reintroduced.
 */
function isBootstrapAdminEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const raw = process.env.ADMIN_BOOTSTRAP_EMAILS || '';
  const list = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const defaultAdminEmails = [
    'admin@bluehillsdesigners.com',
    'admin@bluehills.com',
    'patricia@bluehills.com',
    'moses@bluehills.com',
    'owner@yourdomain.com',
    'loyohenoch@gmail.com',
    'loyoenock@gmail.com'
  ];
  const target = email.trim().toLowerCase();
  return list.includes(target) || defaultAdminEmails.includes(target);
}

/**
 * Validates whether a string is a well-formed HTTP/HTTPS URL.
 */
function isValidUrl(val: string): boolean {
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Helper to perform fetch requests with an AbortController timeout.
 * Reduced per-call timeout to 3000ms to stay safely within Vercel Edge runtime constraints.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // Fast early return for paths that do not require auth interception
    const isProtectedAdmin = pathname.startsWith('/admin');
    const isProtectedAccount = pathname.startsWith('/account');
    const isProtectedCheckout = pathname.startsWith('/checkout');

    if (!isProtectedAdmin && !isProtectedAccount && !isProtectedCheckout) {
      return NextResponse.next();
    }

    /**
     * VERCEL EDGE RUNTIME ENVIRONMENT NOTE:
     * Both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY)
     * MUST be configured in the Vercel Project Settings under Environment Variables for Production and Preview.
     * The NEXT_PUBLIC_ prefix is required for Edge runtime visibility if non-public names are omitted.
     */
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || !supabaseAnonKey || !isValidUrl(supabaseUrl)) {
      log.warn('[MIDDLEWARE] Supabase configuration missing or invalid. Blocking protected route and redirecting to login.');
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      try {
        redirectResponse.cookies.delete('sb-access-token');
        redirectResponse.cookies.delete('sb-refresh-token');
      } catch {
        // Ignore cookie deletion errors in edge fallback
      }
      return redirectResponse;
    }

    // Read tokens from cookies
    let accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    const authStartTime = Date.now();
    const AUTH_TOTAL_TIMEOUT_MS = 6000;

    const getRemainingTimeout = (maxTimeoutMs = 3000) => {
      const remaining = AUTH_TOTAL_TIMEOUT_MS - (Date.now() - authStartTime);
      return Math.max(100, Math.min(maxTimeoutMs, remaining));
    };

    let user: any = null;
    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;
    let expiresIn = 3600;

    const sanitizedBaseUrl = supabaseUrl.replace(/\/+$/, '');

    // 1. Try to validate existing access token
    if (accessToken) {
      try {
        const timeout = getRemainingTimeout(3000);
        const response = await fetchWithTimeout(`${sanitizedBaseUrl}/auth/v1/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey,
          },
          cache: 'no-store'
        }, timeout);

        if (response.ok) {
          try {
            user = await response.json();
          } catch (jsonErr) {
            log.warn('[MIDDLEWARE] Failed to parse user payload JSON:', jsonErr);
            user = null;
          }
        } else {
          log.warn(`[MIDDLEWARE] Access token validation returned status: ${response.status}`);
        }
      } catch (err) {
        log.warn('[MIDDLEWARE] Direct token validation fetch error:', err);
      }
    }

    // 2. If token is invalid/expired/missing but refresh token exists, attempt silent refresh
    if ((!user || !user.id) && refreshToken && (Date.now() - authStartTime < AUTH_TOTAL_TIMEOUT_MS)) {
      log.info('[MIDDLEWARE] Access token missing or invalid. Attempting silent token refresh.');
      try {
        const timeout = getRemainingTimeout(3000);
        const refreshResponse = await fetchWithTimeout(`${sanitizedBaseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          cache: 'no-store'
        }, timeout);

        if (refreshResponse.ok) {
          try {
            const refreshData = await refreshResponse.json();
            if (refreshData && refreshData.access_token && refreshData.user) {
              user = refreshData.user;
              accessToken = refreshData.access_token;
              newAccessToken = refreshData.access_token;
              newRefreshToken = refreshData.refresh_token || null;
              expiresIn = refreshData.expires_in || 3600;
              log.info('[MIDDLEWARE] Silent token refresh successful.');
            }
          } catch (jsonErr) {
            log.warn('[MIDDLEWARE] Failed to parse token refresh response JSON:', jsonErr);
          }
        } else {
          log.warn(`[MIDDLEWARE] Silent token refresh failed: status ${refreshResponse.status}`);
        }
      } catch (refreshErr) {
        log.warn('[MIDDLEWARE] Silent token refresh exception:', refreshErr);
      }
    }

    // 3. If still unauthenticated, redirect to sign-in portal
    if (!user || !user.id) {
      log.warn('[MIDDLEWARE] Unauthenticated access intercept: redirecting to login');
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      try {
        redirectResponse.cookies.delete('sb-access-token');
        redirectResponse.cookies.delete('sb-refresh-token');
      } catch {
        // Safe cookie cleanup
      }
      return redirectResponse;
    }

    // Prepare response
    let response = NextResponse.next();

    // 4. Role management validation for administrative sections
    if (isProtectedAdmin) {
      let userRole = 'Customer';

      // Direct owner/developer bootstrap check: assign Super Admin with zero extra awaits or REST queries
      if (user.email && isBootstrapAdminEmail(user.email)) {
        userRole = 'Super Admin';
      } else if (Date.now() - authStartTime < AUTH_TOTAL_TIMEOUT_MS) {
        // Query the database profiles table directly via REST API using the validated JWT
        try {
          const timeout = getRemainingTimeout(3000);
          const profileRes = await fetchWithTimeout(
            `${sanitizedBaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': supabaseAnonKey,
              },
              cache: 'no-store'
            },
            timeout
          );

          if (profileRes.ok) {
            try {
              const profiles = await profileRes.json();
              const rawRole = profiles?.[0]?.role;
              userRole = (typeof rawRole === 'string' && rawRole.trim()) ? rawRole : (user.user_metadata?.role || 'Customer');
            } catch (jsonErr) {
              log.warn('[MIDDLEWARE] Failed to parse profile response JSON:', jsonErr);
              userRole = user.user_metadata?.role || 'Customer';
            }
          } else {
            log.warn(`[MIDDLEWARE] Profile DB lookup failed with status: ${profileRes.status}, falling back to auth metadata`);
            userRole = user.user_metadata?.role || 'Customer';
          }
        } catch (dbErr) {
          log.warn('[MIDDLEWARE] Direct DB profile fetch exception, falling back:', dbErr);
          userRole = user.user_metadata?.role || 'Customer';
        }
      } else {
        userRole = user.user_metadata?.role || 'Customer';
      }

      const normalizedRole = String(userRole || 'Customer').trim().toLowerCase();
      const authorizedRoles = ['super admin', 'admin', 'manager', 'staff'];
      
      if (!authorizedRoles.includes(normalizedRole)) {
        log.warn(`[MIDDLEWARE] Intercepted unauthorized access attempt by ${user.email} with role: ${userRole}`);
        const accountUrl = request.nextUrl.clone();
        accountUrl.pathname = '/account';
        response = NextResponse.redirect(accountUrl);
      }
    }

    // 5. Append new credentials in response cookies if refreshed silently
    if (newAccessToken) {
      try {
        const isSecure =
          request.nextUrl.protocol === 'https:' ||
          request.headers.get('x-forwarded-proto') === 'https';
        const cookieOptions = {
          path: '/',
          maxAge: expiresIn,
          sameSite: 'lax' as const,
          secure: isSecure,
          httpOnly: true
        };
        response.cookies.set('sb-access-token', newAccessToken, cookieOptions);
        if (newRefreshToken) {
          response.cookies.set('sb-refresh-token', newRefreshToken, {
            ...cookieOptions,
            maxAge: 604800 // 7 days
          });
        }
      } catch (cookieErr) {
        log.warn('[MIDDLEWARE] Failed to set refreshed cookies in response:', cookieErr);
      }
    }

    return response;
  } catch (err) {
    console.error('[MIDDLEWARE] Unexpected middleware error:', err);
    try {
      const fallbackUrl = request.nextUrl.clone();
      fallbackUrl.pathname = '/login';
      fallbackUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(fallbackUrl);
    } catch (fallbackErr) {
      console.error('[MIDDLEWARE] Fallback redirect error:', fallbackErr);
      return new NextResponse(null, { status: 307, headers: { Location: '/login' } });
    }
  }
}

// Intercept matchers
export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/checkout/:path*']
};


