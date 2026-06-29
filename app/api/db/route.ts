import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { action, tableName, payload } = await req.json();

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase admin client could not be initialized' },
        { status: 500 }
      );
    }

    if (action === 'insert') {
      const { data, error } = await supabase.from(tableName).insert(payload).select();
      if (error) {
        if (error.code === '23503') {
          return NextResponse.json({
            data: null,
            message: `Skipped insert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        return NextResponse.json({ error }, { status: 400 });
      }
      return NextResponse.json({ data });
    } else if (action === 'upsert') {
      const { data, error } = await supabase.from(tableName).upsert(payload).select();
      if (error) {
        if (error.code === '23503') {
          return NextResponse.json({
            data: null,
            message: `Skipped upsert on ${tableName} due to foreign key constraint: ${error.message}`
          });
        }
        return NextResponse.json({ error }, { status: 400 });
      }
      return NextResponse.json({ data });
    } else if (action === 'delete') {
      const { filters } = payload || {};
      if (!filters || Object.keys(filters).length === 0) {
        return NextResponse.json({ error: 'Delete filters are required' }, { status: 400 });
      }

      let query = supabase.from(tableName).delete();
      for (const [key, val] of Object.entries(filters)) {
        query = query.eq(key, val);
      }

      const { error } = await query;
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }
  } catch (err: any) {
    const isConnectionError = 
      err?.message?.includes('fetch') ||
      err?.message?.includes('Network') ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('connect') ||
      err?.name === 'TypeError';

    if (isConnectionError) {
      console.warn('Database proxy connection issue (Supabase offline):', err.message || 'Failed to fetch');
    } else {
      console.error('Database proxy API error:', err);
    }
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
