import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chargeMobileMoney, chargeCard } from '@/lib/payment';
import { ApiError } from '@/lib/apiUtils';

describe('Payment Engine - chargeMobileMoney & chargeCard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('chargeMobileMoney', () => {
    it('throws ApiError 400 if phone number is invalid or too short', async () => {
      await expect(
        chargeMobileMoney({
          total: 50000,
          email: 'customer@example.com',
          momoNumber: '12345',
          momoProvider: 'MTN',
        })
      ).rejects.toThrow(ApiError);
    });

    it('returns sandbox success result when in test mode without live secret key', async () => {
      process.env.PAYMENT_TEST_MODE = 'true';
      delete process.env.FLUTTERWAVE_SECRET_KEY;

      const result = await chargeMobileMoney({
        total: 100000,
        email: 'client@example.com',
        momoNumber: '0771234567',
        momoProvider: 'MTN',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('Paid');
      expect(result.provider).toBe('Flutterwave');
      expect(result.transactionId).toMatch(/^FLW-TEST-MM-MTN-/);
    });

    it('triggers test-mode decline for specific test phone numbers', async () => {
      process.env.PAYMENT_TEST_MODE = 'true';

      const declineNumbers = ['0700000000', '0770000000'];
      for (const phone of declineNumbers) {
        await expect(
          chargeMobileMoney({
            total: 75000,
            email: 'test@example.com',
            momoNumber: phone,
            momoProvider: 'Airtel',
          })
        ).rejects.toThrow('Mobile Money transaction was declined by carrier escrow gateway');
      }
    });

    it('handles live Flutterwave API success branch (successful & pending)', async () => {
      process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_LIVE_test1234567890';
      process.env.PAYMENT_TEST_MODE = 'false';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            status: 'successful',
            flw_ref: 'FLW-MOMO-LIVE-999999',
            id: 123456,
          },
        }),
      });
      global.fetch = mockFetch;

      const result = await chargeMobileMoney({
        total: 150000,
        email: 'subscriber@example.com',
        momoNumber: '0772987654',
        momoProvider: 'MTN',
        orderRef: 'ORD-999',
      });

      expect(result).toEqual({
        success: true,
        transactionId: 'FLW-MOMO-LIVE-999999',
        status: 'Paid',
        provider: 'Flutterwave',
        rawResponse: expect.objectContaining({ status: 'successful' }),
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            status: 'pending',
            flw_ref: 'FLW-MOMO-PENDING-888',
          },
        }),
      });

      const pendingResult = await chargeMobileMoney({
        total: 150000,
        email: 'subscriber@example.com',
        momoNumber: '0772987654',
        momoProvider: 'MTN',
      });

      expect(pendingResult.status).toBe('Pending');
    });

    it('handles live Flutterwave API decline branch', async () => {
      process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_LIVE_test1234567890';
      process.env.PAYMENT_TEST_MODE = 'false';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          status: 'error',
          message: 'Insufficient subscriber funds',
        }),
      });

      await expect(
        chargeMobileMoney({
          total: 200000,
          email: 'subscriber@example.com',
          momoNumber: '0772987654',
          momoProvider: 'MTN',
        })
      ).rejects.toThrow('Mobile Money Payment Failed: Insufficient subscriber funds');
    });

    it('handles live Flutterwave API network error in non-test mode (throws 502)', async () => {
      process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_LIVE_real_production_key';
      process.env.PAYMENT_TEST_MODE = 'false';

      global.fetch = vi.fn().mockRejectedValue(new Error('Network connection failure'));

      await expect(
        chargeMobileMoney({
          total: 200000,
          email: 'subscriber@example.com',
          momoNumber: '0772987654',
          momoProvider: 'MTN',
        })
      ).rejects.toThrow('Mobile Money Gateway Error: Network connection failure');
    });
  });

  describe('chargeCard', () => {
    it('throws ApiError 400 if token is missing', async () => {
      await expect(
        chargeCard({
          total: 120000,
          email: 'cardholder@example.com',
        })
      ).rejects.toThrow('A valid card token');
    });

    it('returns sandbox success result for valid card token in test mode', async () => {
      process.env.PAYMENT_TEST_MODE = 'true';
      delete process.env.FLUTTERWAVE_SECRET_KEY;

      const result = await chargeCard({
        total: 250000,
        email: 'cardholder@example.com',
        cardToken: 'flw_tok_valid_test_token',
        cardLast4: '4242',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('Paid');
      expect(result.provider).toBe('Flutterwave');
      expect(result.transactionId).toMatch(/^FLW-TEST-VISA-/);
    });

    it('triggers test-mode decline for tokens containing decline or fail', async () => {
      process.env.PAYMENT_TEST_MODE = 'true';

      const declineTokens = ['tok_declined', 'card_decline_sample', 'token_fail_123'];
      for (const token of declineTokens) {
        await expect(
          chargeCard({
            total: 300000,
            email: 'test@example.com',
            cardToken: token,
          })
        ).rejects.toThrow('Card payment authorization failed');
      }
    });

    it('handles live Flutterwave Card API success branch', async () => {
      process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_LIVE_card_secret_123';
      process.env.PAYMENT_TEST_MODE = 'false';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            flw_ref: 'FLW-CARD-LIVE-777777',
            id: 98765,
          },
        }),
      });

      const result = await chargeCard({
        total: 450000,
        email: 'vip@example.com',
        cardToken: 'flw_tok_live_4242',
        cardLast4: '4242',
      });

      expect(result).toEqual({
        success: true,
        transactionId: 'FLW-CARD-LIVE-777777',
        status: 'Paid',
        provider: 'Flutterwave',
        rawResponse: expect.objectContaining({ flw_ref: 'FLW-CARD-LIVE-777777' }),
      });
    });

    it('handles live Flutterwave Card API decline branch', async () => {
      process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_LIVE_card_secret_123';
      process.env.PAYMENT_TEST_MODE = 'false';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          status: 'error',
          message: 'Stolen card reported by issuing bank',
        }),
      });

      await expect(
        chargeCard({
          total: 450000,
          email: 'vip@example.com',
          cardToken: 'flw_tok_stolen',
        })
      ).rejects.toThrow('Card Settlement Failed: Stolen card reported by issuing bank');
    });

    it('handles live Flutterwave Card API network error in non-test mode (throws 502)', async () => {
      process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_LIVE_card_secret_123';
      process.env.PAYMENT_TEST_MODE = 'false';

      global.fetch = vi.fn().mockRejectedValue(new Error('DNS resolution timeout'));

      await expect(
        chargeCard({
          total: 450000,
          email: 'vip@example.com',
          cardToken: 'flw_tok_valid',
        })
      ).rejects.toThrow('Card Gateway Error: DNS resolution timeout');
    });
  });
});
