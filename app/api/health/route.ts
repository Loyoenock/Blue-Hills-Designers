import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger } from '@/lib/apiUtils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    // 1. Rate Limiting Check (Max 60 health checks per minute to prevent status abuse)
    const rateLimitRes = enforceRateLimit(req, 60, 60000);

    logger.info('Health monitoring check initiated.');
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
          logger.info('Supabase database connectivity check succeeded.');
          logs.push('Supabase database connectivity check succeeded.');
        } else {
          databaseDetails = `Query failed: ${error.message}`;
          logger.warn(`Supabase connection warning: ${error.message}`);
          logs.push(`Supabase connection warning: ${error.message}`);
        }
      } else {
        logger.warn('Supabase client is not initialized due to missing credentials.');
        logs.push('Supabase client is not initialized due to missing credentials.');
      }
    } catch (err: any) {
      databaseDetails = `Exception occurred: ${err.message || err}`;
      logger.error('Database connection exception', err);
      logs.push(`Database connection exception: ${err.message || err}`);
    }

    const durationMs = Date.now() - startTime;
    logger.info('Health check completed successfully', { latencyMs: durationMs, databaseConnected });
    
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
  } catch (error: any) {
    return createErrorResponse(req, error);
  }
}
