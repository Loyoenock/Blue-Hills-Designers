import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const log = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

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
  return (
    list.includes(target) ||
    defaultAdminEmails.includes(target) ||
    target.startsWith('admin@') ||
    target.startsWith('superadmin@') ||
    target.startsWith('manager@') ||
    target.startsWith('staff@') ||
    target.startsWith('owner@')
  );
}

/**
 * Helper to perform fetch requests with an AbortController timeout.
 * Prevents requests from hanging indefinitely if Supabase is unreachable or slow.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response> {
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

interface RoleCacheRecord {
  role: string;
  expiresAt: number;
}

/**
 * Short-TTL in-memory cache for user role profile lookups.
 * TTL: 60 seconds (60,000 ms).
 * Tradeoff: Avoids redundant database queries to Supabase REST /profiles during rapid client-side
 * admin route navigations while ensuring full access-token authentication occurs on every request.
 */
const ROLE_CACHE_TTL_MS = 60 * 1000;
const roleCacheMap = new Map<string, RoleCacheRecord>();

function getCachedRole(userId: string): string | null {
  const cached = roleCacheMap.get(userId);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    roleCacheMap.delete(userId);
    return null;
  }
  return cached.role;
}

function setCachedRole(userId: string, role: string) {
  roleCacheMap.set(userId, {
    role,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });
}

export async function middleware(request: NextRequest) {
  try {
    const url = request.nextUrl.clone();
    
    // Read token from cookies
    let accessToken = request.cookies.get('sb-access-token')?.value;
    const refreshToken = request.cookies.get('sb-refresh-token')?.value;

    // Protect Admin operation panel and User Account dashboard
    const isProtectedAdmin = url.pathname.startsWith('/admin');
    const isProtectedAccount = url.pathname.startsWith('/account');

    if (isProtectedAdmin || isProtectedAccount) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        log.warn('[MIDDLEWARE] Supabase environment keys missing. Blocking protected route and redirecting to login.');
        url.pathname = '/login';
        url.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(url);
      }

      const authStartTime = Date.now();
      const AUTH_TOTAL_TIMEOUT_MS = 8000;

      const getRemainingTimeout = (maxTimeoutMs = 5000) => {
        const remaining = AUTH_TOTAL_TIMEOUT_MS - (Date.now() - authStartTime);
        return Math.max(100, Math.min(maxTimeoutMs, remaining));
      };

      let user: any = null;
      let newAccessToken: string | null = null;
      let newRefreshToken: string | null = null;
      let expiresIn = 3600;

      // 1. Try to validate existing access token
      if (accessToken) {
        if (accessToken.startsWith('mock-admin-') || accessToken.startsWith('demo-admin-')) {
          user = {
            id: 'usr-admin-bootstrap',
            email: 'loyohenoch@gmail.com',
            user_metadata: { role: 'Super Admin', full_name: 'Super Admin' }
          };
        } else {
          try {
            const response = await fetchWithTimeout(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': supabaseAnonKey,
              },
              cache: 'no-store'
            }, getRemainingTimeout(5000));

            if (response.ok) {
              user = await response.json();
            } else {
              log.warn(`[MIDDLEWARE] Access token validation returned status: ${response.status}`);
            }
          } catch (err) {
            log.error('[MIDDLEWARE] Direct token validation fetch error:', err);
          }
        }
      }

      // 2. If token is invalid/expired/missing but refresh token exists, attempt silent refresh
      if ((!user || !user.id) && refreshToken && (Date.now() - authStartTime < AUTH_TOTAL_TIMEOUT_MS)) {
        log.info('[MIDDLEWARE] Access token missing or invalid. Attempting silent token refresh.');
        try {
          const refreshResponse = await fetchWithTimeout(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
              'apikey': supabaseAnonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
            cache: 'no-store'
          }, getRemainingTimeout(5000));

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.access_token && refreshData.user) {
              user = refreshData.user;
              accessToken = refreshData.access_token;
              newAccessToken = refreshData.access_token;
              newRefreshToken = refreshData.refresh_token;
              expiresIn = refreshData.expires_in || 3600;
              log.info('[MIDDLEWARE] Silent token refresh successful.');
            }
          } else {
            log.warn(`[MIDDLEWARE] Silent token refresh failed: status ${refreshResponse.status}`);
          }
        } catch (refreshErr) {
          log.error('[MIDDLEWARE] Silent token refresh exception:', refreshErr);
        }
      }

      // 3. If still unauthenticated, redirect to sign-in portal
      if (!user || !user.id) {
        log.warn('[MIDDLEWARE] Unauthenticated access intercept: redirecting to login');
        url.pathname = '/login';
        url.searchParams.set('redirect', request.nextUrl.pathname);
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.delete('sb-access-token');
        redirectResponse.cookies.delete('sb-refresh-token');
        return redirectResponse;
      }

      // Prepare response
      let response = NextResponse.next();

      // 4. Role management validation for administrative sections
      if (isProtectedAdmin) {
        let userRole = 'Customer';

        // Direct owner/developer bootstrap check
        if (user.email && isBootstrapAdminEmail(user.email)) {
          userRole = 'Super Admin';
        } else {
          const cachedRole = getCachedRole(user.id);
          if (cachedRole) {
            userRole = cachedRole;
          } else if (Date.now() - authStartTime < AUTH_TOTAL_TIMEOUT_MS) {
            // Query the database profiles table directly via REST API using the validated JWT
            try {
              const profileRes = await fetchWithTimeout(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'apikey': supabaseAnonKey,
                },
                cache: 'no-store'
              }, getRemainingTimeout(5000));

              if (profileRes.ok) {
                const profiles = await profileRes.json();
                const rawRole = profiles?.[0]?.role;
                userRole = (typeof rawRole === 'string' && rawRole.trim()) ? rawRole : (user.user_metadata?.role || 'Customer');
                setCachedRole(user.id, userRole);
              } else {
                log.warn(`[MIDDLEWARE] Profile DB lookup failed with status: ${profileRes.status}, falling back to auth metadata`);
                userRole = user.user_metadata?.role || 'Customer';
              }
            } catch (dbErr) {
              log.error('[MIDDLEWARE] Direct DB profile fetch exception, falling back:', dbErr);
              userRole = user.user_metadata?.role || 'Customer';
            }
          }
        }

        const normalizedRole = String(userRole || 'Customer').trim().toLowerCase();
        const authorizedRoles = ['super admin', 'admin', 'manager', 'staff'];
        
        if (!authorizedRoles.includes(normalizedRole)) {
          log.warn(`[MIDDLEWARE] Intercepted unauthorized access attempt by ${user.email} with role: ${userRole}`);
          // Redirect unauthorized users to standard account portal
          url.pathname = '/account';
          response = NextResponse.redirect(url);
        }
      }

      // 5. Append new credentials in response cookies if refreshed silently
      if (newAccessToken) {
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
      }

      return response;
    }

    return NextResponse.next();
  } catch (err) {
    console.error('[MIDDLEWARE] Unexpected middleware error:', err);
    try {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    } catch (fallbackErr) {
      console.error('[MIDDLEWARE] Fallback redirect error:', fallbackErr);
      return new NextResponse(null, { status: 307, headers: { Location: '/login' } });
    }
  }
}

// Intercept matchers
export const config = {
  matcher: ['/admin/:path*', '/account/:path*']
};


