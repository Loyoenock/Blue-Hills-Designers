import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { isNetworkOrConnectionError } from './utils';
import './env';

let supabaseClientInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryableFetch(url: string, options?: RequestInit, maxRetries = 3, initialDelayMs = 500): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      
      // Retry on 5xx server errors (including 503, common during Supabase database sleep cold start)
      if (!response.ok && response.status >= 500 && attempt < maxRetries) {
        attempt++;
        const delayTime = initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        console.warn(`Supabase server returned status ${response.status} for ${url}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delayTime)}ms...`);
        await delay(delayTime);
        continue;
      }
      
      return response;
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === 'string' ? err : String(err || ''));
      const isConnError = isNetworkOrConnectionError(err);

      if (isConnError && attempt < maxRetries) {
        attempt++;
        const delayTime = initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        console.warn(`Supabase connection error for ${url}: ${errMsg}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delayTime)}ms...`);
        await delay(delayTime);
        continue;
      }
      
      throw err;
    }
  }
}

/**
 * Returns the standard Supabase client for public/anonymous access.
 * Uses lazy initialization to prevent startup crashes when keys are missing.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url, options) => {
          const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
          const fetchOptions: RequestInit = { ...options };
          if (isGet) {
            fetchOptions.cache = 'no-store';
          }
          return retryableFetch(url as string, fetchOptions);
        }
      }
    });
  }
  return supabaseClientInstance;
}

/**
 * Returns a privileged Supabase client using the service role key.
 * Strictly for server-side usage (API routes, server actions).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdmin can only be executed in a server-side environment.');
  }

  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to anon key.');
      supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Supabase Admin configuration is incomplete. Please ensure both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) are configured.'
      );
    }

    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (url, options) => {
          const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
          const fetchOptions: RequestInit = { ...options };
          if (isGet) {
            fetchOptions.cache = 'no-store';
          }
          return retryableFetch(url as string, fetchOptions);
        }
      }
    });
  }
  return supabaseAdminInstance;
}

/**
 * Returns a request-scoped Supabase client utilizing the anonymous key,
 * forwarding the request's access token inside the Authorization header.
 * This guarantees operations are run in PostgreSQL under the user's role and sub policies.
 */
export function getSupabaseForRequest(accessToken: string | null): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase configuration is incomplete. Please ensure both SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.'
    );
  }

  const options: any = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {},
      fetch: (url: string, fetchOptions: any) => {
        const isGet = !fetchOptions || !fetchOptions.method || fetchOptions.method.toUpperCase() === 'GET';
        const updatedOptions: RequestInit = { ...fetchOptions };
        if (isGet) {
          updatedOptions.cache = 'no-store';
        }
        return retryableFetch(url as string, updatedOptions);
      }
    }
  };

  if (accessToken) {
    options.global.headers.Authorization = `Bearer ${accessToken}`;
  }

  return createClient(supabaseUrl, supabaseAnonKey, options);
}
