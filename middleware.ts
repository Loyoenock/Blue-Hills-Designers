import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Read token from cookies
  const accessToken = request.cookies.get('sb-access-token')?.value;

  // Protect Admin operation panel and User Account dashboard
  const isProtectedAdmin = url.pathname.startsWith('/admin');
  const isProtectedAccount = url.pathname.startsWith('/account');

  if (isProtectedAdmin || isProtectedAccount) {
    if (!accessToken) {
      // Unauthenticated, redirect to sign-in portal
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[MIDDLEWARE] Supabase environment keys missing. Bypassing token validation.');
        return NextResponse.next();
      }

      // Edge-native direct REST API check to verify JWT and retrieve user profile.
      // This is highly performant and avoids Edge Runtime Node.js API warnings.
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': supabaseAnonKey,
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        console.warn(`[MIDDLEWARE] Access token validation failure: status ${response.status}`);
        url.pathname = '/login';
        url.searchParams.set('redirect', request.nextUrl.pathname);
        const redirectResponse = NextResponse.redirect(url);
        // Clear expired or invalid cookies
        redirectResponse.cookies.delete('sb-access-token');
        redirectResponse.cookies.delete('sb-refresh-token');
        return redirectResponse;
      }

      const user = await response.json();

      if (!user || !user.id) {
        console.warn('[MIDDLEWARE] User object invalid or missing ID');
        url.pathname = '/login';
        url.searchParams.set('redirect', request.nextUrl.pathname);
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.delete('sb-access-token');
        redirectResponse.cookies.delete('sb-refresh-token');
        return redirectResponse;
      }

      // Role management validation for administrative sections
      if (isProtectedAdmin) {
        const userRole = user.user_metadata?.role || 'Customer';
        const normalizedRole = userRole.trim().toLowerCase();
        
        const authorizedRoles = ['super admin', 'admin', 'manager', 'staff'];
        if (!authorizedRoles.includes(normalizedRole)) {
          console.warn(`[MIDDLEWARE] Intercepted unauthorized access attempt by user ${user.email} with role: ${userRole}`);
          // Redirect unauthorized users to standard account portal
          url.pathname = '/account';
          return NextResponse.redirect(url);
        }
      }
    } catch (err) {
      console.error('[MIDDLEWARE] Auth intercept unhandled exception:', err);
    }
  }

  return NextResponse.next();
}

// Intercept matchers
export const config = {
  matcher: ['/admin/:path*', '/account/:path*']
};
