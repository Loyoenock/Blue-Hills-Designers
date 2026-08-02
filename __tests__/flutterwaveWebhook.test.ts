import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/webhooks/flutterwave/route';
import { NextRequest } from 'next/server';
import * as supabaseLib from '@/lib/supabase';

describe('Flutterwave Webhook Route', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.PAYMENT_TEST_MODE = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('updates payment and order status successfully and returns 200', async () => {
    const mockPaymentRecord = {
      id: 'pay-123',
      order_id: 'ord-456',
      transaction_id: 'FLW-TXN-1001',
      status: 'pending',
    };

    const paymentUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const orderUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const auditInsertMock = vi.fn().mockResolvedValue({ error: null });

    const mockSupabaseAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPaymentRecord, error: null }),
              }),
            }),
            update: paymentUpdateMock,
          };
        }
        if (table === 'orders') {
          return {
            update: orderUpdateMock,
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: auditInsertMock,
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
      method: 'POST',
      body: JSON.stringify({
        event: 'charge.completed',
        data: {
          tx_ref: 'FLW-TXN-1001',
          flw_ref: 'FLW-1001',
          status: 'successful',
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('success');
    expect(paymentUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        updated_at: expect.any(String),
      })
    );
    expect(orderUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        updated_at: expect.any(String),
      })
    );
  });

  it('returns 502 status when database update fails so Flutterwave retries', async () => {
    const mockPaymentRecord = {
      id: 'pay-123',
      order_id: 'ord-456',
      transaction_id: 'FLW-TXN-1002',
      status: 'pending',
    };

    const paymentUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: 'Column updated_at does not exist' } }),
    });

    const mockSupabaseAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockPaymentRecord, error: null }),
              }),
            }),
            update: paymentUpdateMock,
          };
        }
        if (table === 'orders') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
      method: 'POST',
      body: JSON.stringify({
        event: 'charge.completed',
        data: {
          tx_ref: 'FLW-TXN-1002',
          flw_ref: 'FLW-1002',
          status: 'successful',
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe('Failed to update payment or order status in database');
  });

  it('handles fallback order update error and returns 502', async () => {
    const mockOrderRecord = {
      id: 'ord-999',
      order_number: 'ORD-999',
      status: 'pending',
    };

    const mockSupabaseAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'payments') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrderRecord, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: 'Database failure' } }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdmin').mockReturnValue(mockSupabaseAdmin as any);

    const req = new NextRequest('http://localhost:3000/api/webhooks/flutterwave', {
      method: 'POST',
      body: JSON.stringify({
        event: 'charge.completed',
        data: {
          tx_ref: 'ORD-999',
          status: 'successful',
        },
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe('Failed to update order status in database');
  });
});
