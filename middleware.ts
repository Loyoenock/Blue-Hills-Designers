import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
      console.warn('[MIDDLEWARE] Supabase environment keys missing. Bypassing token validation.');
      return NextResponse.next();
    }

    let user = null;
    let newAccessToken = null;
    let newRefreshToken = null;
    let expiresIn = 3600;

    // 1. Try to validate existing access token
    if (accessToken) {
      try {
        const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': supabaseAnonKey,
          },
          cache: 'no-store'
        });

        if (response.ok) {
          user = await response.json();
        } else {
          console.warn(`[MIDDLEWARE] Access token validation returned status: ${response.status}`);
        }
      } catch (err) {
        console.error('[MIDDLEWARE] Direct token validation fetch error:', err);
      }
    }

    // 2. If token is invalid/expired/missing but refresh token exists, attempt silent refresh
    if ((!user || !user.id) && refreshToken) {
      console.log('[MIDDLEWARE] Access token missing or invalid. Attempting silent token refresh.');
      try {
        const refreshResponse = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
          cache: 'no-store'
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          if (refreshData.access_token && refreshData.user) {
            user = refreshData.user;
            accessToken = refreshData.access_token;
            newAccessToken = refreshData.access_token;
            newRefreshToken = refreshData.refresh_token;
            expiresIn = refreshData.expires_in || 3600;
            console.log('[MIDDLEWARE] Silent token refresh successful.');
          }
        } else {
          console.warn(`[MIDDLEWARE] Silent token refresh failed: status ${refreshResponse.status}`);
        }
      } catch (refreshErr) {
        console.error('[MIDDLEWARE] Silent token refresh exception:', refreshErr);
      }
    }

    // 3. If still unauthenticated, redirect to sign-in portal
    if (!user || !user.id) {
      console.warn('[MIDDLEWARE] Unauthenticated access intercept: redirecting to login');
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

      // Direct owner/developer bypass
      if (user.email && user.email.toLowerCase() === 'loyohenoch@gmail.com') {
        userRole = 'Super Admin';
      } else {
        // Query the database profiles table directly via REST API using the validated JWT
        try {
          const profileRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/profiles?id=eq.${user.id}&select=*`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': supabaseAnonKey,
            },
            cache: 'no-store'
          });

          if (profileRes.ok) {
            const profiles = await profileRes.json();
            if (Array.isArray(profiles) && profiles.length > 0) {
              userRole = profiles[0].role || 'Customer';
            } else {
              userRole = user.user_metadata?.role || 'Customer';
            }
          } else {
            console.warn(`[MIDDLEWARE] Profile DB lookup failed with status: ${profileRes.status}, falling back to auth metadata`);
            userRole = user.user_metadata?.role || 'Customer';
          }
        } catch (dbErr) {
          console.error('[MIDDLEWARE] Direct DB profile fetch exception, falling back:', dbErr);
          userRole = user.user_metadata?.role || 'Customer';
        }
      }

      const normalizedRole = userRole.trim().toLowerCase();
      const authorizedRoles = ['super admin', 'admin', 'manager', 'staff'];
      
      if (!authorizedRoles.includes(normalizedRole)) {
        console.warn(`[MIDDLEWARE] Intercepted unauthorized access attempt by ${user.email} with role: ${userRole}`);
        // Redirect unauthorized users to standard account portal
        url.pathname = '/account';
        response = NextResponse.redirect(url);
      }
    }

    // 5. Append new credentials in response cookies if refreshed silently
    if (newAccessToken) {
      const isSecure = request.nextUrl.protocol === 'https:';
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
}

// Intercept matchers
export const config = {
  matcher: ['/admin/:path*', '/account/:path*']
};

