import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from '@/store/useStore';

describe('safeSupabase write false-success prevention', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('bookConsultation returns failure when safeSupabaseInsert fails due to network/server error', async () => {
    // Mock fetch to simulate instant 500 response or network rejection without long delays
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Simulated DB connection error' })
    }));

    // Mock environment variable so isSupabaseConfigured returns true
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fake-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'fake-anon-key';

    const store = useStore.getState();
    const result = await store.bookConsultation({
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      clientPhone: '+256700000000',
      date: '2026-09-01',
      time: '10:00 AM',
      notes: 'Test booking'
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Simulated DB connection error/i);
  }, 15000);

});
