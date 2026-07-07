import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];
  
  // 1. Rate Limiting Check (Max 60 health checks per minute to prevent status abuse)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rateLimitRes = checkRateLimit(ip, 60, 60000);
  if (!rateLimitRes.success) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Too many status check requests.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(rateLimitRes.limit),
          'X-RateLimit-Remaining': String(rateLimitRes.remaining),
          'X-RateLimit-Reset': String(rateLimitRes.reset)
        }
      }
    );
  }

  logs.push('Health monitoring check initiated.');

  let databaseConnected = false;
  let databaseDetails = 'Supabase client is offline or not configured';

  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      // Execute a lightweight query to test the active connection structure
      const { data, error } = await supabase.from('products').select('id').limit(1);
      if (!error) {
        databaseConnected = true;
        databaseDetails = 'Successfully queried products table';
        logs.push('Supabase database connectivity check succeeded.');
      } else {
        databaseDetails = `Query failed: ${error.message}`;
        logs.push(`Supabase connection warning: ${error.message}`);
      }
    } else {
      logs.push('Supabase client is not initialized due to missing credentials.');
    }
  } catch (err: any) {
    databaseDetails = `Exception occurred: ${err.message || err}`;
    logs.push(`Database connection exception: ${err.message || err}`);
  }

  const durationMs = Date.now() - startTime;
  
  return NextResponse.json({
    status: databaseConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    latencyMs: durationMs,
    services: {
      database: {
        connected: databaseConnected,
        details: databaseDetails
      },
      rateLimiter: {
        status: 'active',
        remainingLimit: rateLimitRes.remaining
      }
    },
    logs: process.env.NODE_ENV === 'development' ? logs : undefined
  });
}
