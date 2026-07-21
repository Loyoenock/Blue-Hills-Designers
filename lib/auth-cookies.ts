/**
 * Client-side cookies manager for Supabase Auth JWT token persistence.
 * This enables the Next.js edge middleware to verify the session server-side.
 */

export function setAuthCookies(accessToken: string, refreshToken: string, expiresIn: number) {
  if (typeof document === 'undefined') return;
  
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  
  // Set access token cookie matching the token expiry
  document.cookie = `sb-access-token=${accessToken}; path=/; max-age=${expiresIn}; SameSite=Lax${secureFlag}`;
  
  // Set refresh token cookie for longer persistence
  document.cookie = `sb-refresh-token=${refreshToken}; path=/; max-age=604800; SameSite=Lax${secureFlag}`;
}

export function clearAuthCookies() {
  if (typeof document === 'undefined') return;
  
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  
  document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax${secureFlag}`;
  document.cookie = `sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax${secureFlag}`;
}
