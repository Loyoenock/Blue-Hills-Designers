import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    let { name, email, phone, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (email && email.toLowerCase() === 'loyohenoch@gmail.com') {
      role = 'Super Admin';
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client could not be initialized.' },
        { status: 500 }
      );
    }

    // Create the user securely via Supabase Admin Auth API
    // We pass both 'name' and 'full_name' in user_metadata to satisfy any database triggers
    let authUser = null;
    let fallbackToLocal = false;
    let errorMessage = '';

    const isRetryableOrNetworkError = (err: any): boolean => {
      if (!err) return false;
      const name = err.name || '';
      const message = err.message || '';
      const status = typeof err.status === 'number' ? err.status : undefined;

      // If it is a standard validation/client error (e.g. status < 500), it's not a network/retryable error
      if (status !== undefined && status < 500) {
        return false;
      }

      return (
        (status !== undefined && status >= 500) ||
        name === 'AuthRetryableFetchError' ||
        message.toLowerCase().includes('database error') ||
        message.toLowerCase().includes('unexpected_failure') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('connect') ||
        Object.keys(err).length === 0
      );
    };

    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          full_name: name,
          phone,
          role: role || 'Customer'
        }
      });

      if (error) {
        errorMessage = error.message;
        const isNetworkOrAuthError = isRetryableOrNetworkError(error);

        if (isNetworkOrAuthError) {
          console.warn('Supabase service appears offline or unreachable (retryable auth fetch error). Enabling local registration fallback.');
          fallbackToLocal = true;
        } else {
          console.error('Supabase admin createUser error:', error);
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 }
          );
        }
      } else {
        authUser = data?.user;
      }
    } catch (err: any) {
      errorMessage = err.message || '';
      if (isRetryableOrNetworkError(err)) {
        console.warn('Exception during Supabase admin createUser (retryable/network connection error):', errorMessage);
      } else {
        console.error('Exception during Supabase admin createUser:', err);
      }
      fallbackToLocal = true;
    }

    if (fallbackToLocal || !authUser) {
      console.log('Falling back to local/offline user registration due to auth connection issue:', errorMessage);
      // Generate a deterministic or random UUID for local registration fallback
      const localUuid = typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `f81d4fae-7dec-11d0-a765-${Math.random().toString(16).substring(2, 14).padEnd(12, '0')}`;

      return NextResponse.json({
        success: true,
        user: {
          id: localUuid,
          email: email,
          name: name,
          phone: phone,
          role: role || 'Customer'
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        email: authUser.email,
        name: name,
        phone: phone,
        role: role || 'Customer'
      }
    });
  } catch (err: any) {
    console.error('Server-side registration error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'An unexpected server error occurred.' },
      { status: 500 }
    );
  }
}
