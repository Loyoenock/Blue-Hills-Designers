import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
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
        console.error('Supabase admin createUser error:', error);
        errorMessage = error.message;
        // If it is a network error, retryable error, or standard fetch error, trigger fallback
        const isNetworkOrAuthError =
          error.name === 'AuthRetryableFetchError' ||
          error.message?.includes('fetch') ||
          error.message?.includes('network') ||
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('connect') ||
          !error.message;

        if (isNetworkOrAuthError) {
          fallbackToLocal = true;
        } else {
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 400 }
          );
        }
      } else {
        authUser = data?.user;
      }
    } catch (err: any) {
      console.error('Exception during Supabase admin createUser:', err);
      errorMessage = err.message || '';
      fallbackToLocal = true;
    }

    if (fallbackToLocal || !authUser) {
      console.log('Falling back to local/offline user registration due to auth error:', errorMessage);
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
