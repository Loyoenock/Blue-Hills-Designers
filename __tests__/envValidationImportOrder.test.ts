delete process.env.GEMINI_API_KEY;
delete process.env.NEXT_PUBLIC_SUPABASE_URL;
delete process.env.SUPABASE_URL;
delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
delete process.env.SUPABASE_ANON_KEY;

import { describe, it, expect } from 'vitest';
import * as paymentModule from '../lib/payment';
import * as rateLimitModule from '../lib/rateLimit';

describe('Environment Validation Import Order', () => {
  it('successfully imports payment and rateLimit modules at top level without throwing', () => {
    expect(paymentModule).toBeDefined();
    expect(rateLimitModule).toBeDefined();
  });

  it('dynamically imports lib/payment and lib/rateLimit without throwing when env vars are missing', async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_ANON_KEY;

    await expect(import('../lib/payment')).resolves.toBeDefined();
    await expect(import('../lib/rateLimit')).resolves.toBeDefined();
  });
});
