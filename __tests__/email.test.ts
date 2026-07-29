import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mock objects for Resend and Supabase
const mockSend = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.mock('resend', () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn().mockReturnValue({
    from: mockFrom,
  }),
}));

describe('Email Engine - sendTransactionalEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns simulated result in dev-mode when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const { sendTransactionalEmail } = await import('@/lib/email');

    const result = await sendTransactionalEmail({
      to: 'client@example.com',
      subject: 'Order Confirmation',
      html: '<p>Thank you for your order!</p>',
      orderNumber: 'BHD-1001',
    });

    expect(result).toEqual({
      success: true,
      messageId: 'simulated-dev-mode',
      simulated: true,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('dispatches email via Resend and logs audit_logs when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 're_test_valid_key_123';
    mockSend.mockResolvedValueOnce({
      data: { id: 'resend_msg_888' },
      error: null,
    });

    const { sendTransactionalEmail } = await import('@/lib/email');

    const result = await sendTransactionalEmail({
      to: 'customer@example.com',
      subject: 'Your Boutique Purchase',
      html: '<p>Order details...</p>',
      orderNumber: 'BHD-2002',
    });

    expect(result).toEqual({
      success: true,
      messageId: 'resend_msg_888',
    });
    expect(mockSend).toHaveBeenCalledWith({
      from: expect.any(String),
      to: ['customer@example.com'],
      subject: 'Your Boutique Purchase',
      html: '<p>Order details...</p>',
    });
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        action: 'Email Dispatched',
        details: expect.stringContaining('BHD-2002'),
      }),
    ]);
  });

  it('handles Resend API error response and inserts audit_logs failure entry', async () => {
    process.env.RESEND_API_KEY = 're_test_invalid_key_456';
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Domain bluehillsdesigners.com not verified' },
    });

    const { sendTransactionalEmail } = await import('@/lib/email');

    const result = await sendTransactionalEmail({
      to: 'vip@example.com',
      subject: 'Order Shipped',
      html: '<p>Tracking info</p>',
      orderNumber: 'BHD-3003',
    });

    expect(result).toEqual({
      success: false,
      error: 'Domain bluehillsdesigners.com not verified',
    });
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        action: 'Email Delivery Failed',
        details: expect.stringContaining('Domain bluehillsdesigners.com not verified'),
      }),
    ]);
  });

  it('handles thrown exception during send and inserts audit_logs exception entry', async () => {
    process.env.RESEND_API_KEY = 're_test_key_789';
    mockSend.mockRejectedValueOnce(new Error('Network socket disconnected'));

    const { sendTransactionalEmail } = await import('@/lib/email');

    const result = await sendTransactionalEmail({
      to: 'executive@example.com',
      subject: 'Welcome to VIP',
      html: '<p>Welcome</p>',
    });

    expect(result).toEqual({
      success: false,
      error: 'Network socket disconnected',
    });
    expect(mockFrom).toHaveBeenCalledWith('audit_logs');
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        action: 'Email Delivery Exception',
        details: expect.stringContaining('Network socket disconnected'),
      }),
    ]);
  });
});
