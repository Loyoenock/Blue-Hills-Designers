import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSupabaseClient } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger } from '@/lib/apiUtils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const logs: string[] = [];
  
  try {
    // 1. Rate Limiting Check (Max 60 health checks per minute to prevent status abuse)
    const rateLimitRes = await enforceRateLimit(req, 60, 60000);

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

    // Gemini API connectivity check
    let geminiConnected = false;
    let geminiDetails = 'GEMINI_API_KEY is not defined in environment variables';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const geminiRes = await aiClient.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: 'ping',
        });

        if (geminiRes && geminiRes.text) {
          geminiConnected = true;
          geminiDetails = 'Successfully generated response from Gemini model (gemini-3.6-flash)';
          logger.info('Gemini API connectivity check succeeded.');
          logs.push('Gemini API connectivity check succeeded.');
        } else {
          geminiDetails = 'Gemini model returned empty response';
          logger.warn('Gemini API connectivity check returned empty response.');
          logs.push('Gemini API connectivity check returned empty response.');
        }
      } catch (gemErr: any) {
        const errStr = gemErr.message || String(gemErr);
        geminiDetails = `Call failed: ${errStr}`;
        logger.error('Gemini API health check exception', gemErr);
        logs.push(`Gemini API health check exception: ${errStr}`);
      }
    } else {
      logger.warn('Gemini API key not configured for health check.');
      logs.push('Gemini API key not configured for health check.');
    }

    const durationMs = Date.now() - startTime;
    const isHealthy = databaseConnected && (apiKey ? geminiConnected : true);
    logger.info('Health check completed', { latencyMs: durationMs, databaseConnected, geminiConnected });
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      latencyMs: durationMs,
      services: {
        database: {
          connected: databaseConnected,
          details: databaseDetails
        },
        gemini: {
          connected: geminiConnected,
          details: geminiDetails
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
