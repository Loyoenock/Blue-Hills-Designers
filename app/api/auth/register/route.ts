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
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    const authUser = data.user;
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user account. No user data returned.' },
        { status: 400 }
      );
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
