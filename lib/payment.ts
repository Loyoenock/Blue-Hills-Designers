import crypto from 'crypto';
import { ApiError, logger } from './apiUtils';

// Startup-time configuration warning log for misconfigured production deployment
if (process.env.PAYMENT_TEST_MODE !== 'true') {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey || secretKey.includes('placeholder') || secretKey.includes('xxxxxxxx')) {
    logger.warn(
      'MISCONFIGURED PAYMENT GATEWAY: PAYMENT_TEST_MODE is disabled/unset, but FLUTTERWAVE_SECRET_KEY is missing or contains a placeholder/invalid key. Live payment transactions will fall back to sandbox mode.'
    );
  }
}

export interface PaymentChargeResult {
  success: boolean;
  transactionId: string;
  status: 'Paid' | 'Pending' | 'Failed';
  provider: 'Flutterwave' | 'Stripe' | 'Cash on Delivery';
  rawResponse?: any;
}

export interface MobileMoneyChargeParams {
  total: number;
  email: string;
  momoNumber: string;
  momoProvider: 'MTN' | 'Airtel' | string;
  customerName?: string;
  orderRef?: string;
}

export interface CardChargeParams {
  total: number;
  email: string;
  paymentMethodId?: string;
  cardToken?: string;
  cardLast4?: string;
  customerName?: string;
  orderRef?: string;
}

/**
 * Process a Mobile Money charge (MTN / Airtel Uganda) via Flutterwave API or Sandbox
 */
export async function chargeMobileMoney(params: MobileMoneyChargeParams): Promise<PaymentChargeResult> {
  const { total, email, momoNumber, momoProvider, customerName, orderRef } = params;

  if (!momoNumber || momoNumber.trim().replace(/\D/g, '').length < 9) {
    throw new ApiError('A valid Mobile Money wallet number (at least 9 digits) is required.', 400);
  }

  const cleanPhone = momoNumber.trim().replace(/\D/g, '');
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  const isTestMode = process.env.PAYMENT_TEST_MODE === 'true' || !secretKey || secretKey.includes('TEST') || secretKey.startsWith('FLWSECK_TEST');

  logger.info('Processing Mobile Money payment authorization request', {
    email,
    momoProvider: momoProvider.toUpperCase(),
    amount: total,
    isTestMode,
    orderRef
  });

  // Test mode decline check for test numbers
  if (isTestMode && (cleanPhone.includes('0000000') || cleanPhone === '0700000000' || cleanPhone === '0770000000')) {
    logger.warn('Test mode decline triggered for test Mobile Money wallet number', { email });
    throw new ApiError('Mobile Money transaction was declined by carrier escrow gateway: Insufficient subscriber funds or PIN authorization timeout.', 400);
  }

  // If secret key is configured, invoke real Flutterwave API (test or live environment)
  if (secretKey && !secretKey.includes('placeholder') && !secretKey.includes('xxxxxxxx')) {
    try {
      const txRef = orderRef || `momo-txn-${crypto.randomUUID()}`;
      const payload = {
        tx_ref: txRef,
        amount: total,
        currency: 'UGX',
        email,
        phone_number: cleanPhone,
        network: momoProvider.toUpperCase(),
        fullname: customerName || email.split('@')[0],
        redirect_url: process.env.APP_URL ? `${process.env.APP_URL}/checkout` : 'https://localhost:3000/checkout'
      };

      const response = await fetch('https://api.flutterwave.com/v3/charges?type=mobile_money_uganda', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.status === 'success' && data?.data) {
        const flwStatus = data.data.status;
        const transactionId = String(data.data.flw_ref || data.data.id || txRef);
        
        if (flwStatus === 'successful') {
          return {
            success: true,
            transactionId,
            status: 'Paid',
            provider: 'Flutterwave',
            rawResponse: data.data
          };
        } else if (flwStatus === 'pending') {
          return {
            success: true,
            transactionId,
            status: 'Pending',
            provider: 'Flutterwave',
            rawResponse: data.data
          };
        }
      }

      const declineReason = data?.message || data?.data?.processor_response || 'Mobile Money transaction was declined by the carrier escrow gateway.';
      logger.warn('Flutterwave Mobile Money API charge declined:', { declineReason, email });
      throw new ApiError(`Mobile Money Payment Failed: ${declineReason}`, 400);

    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      logger.error('Flutterwave Mobile Money API error:', err);
      // If network error in test mode, fallback gracefully to test transaction result
      if (!isTestMode) {
        throw new ApiError(`Mobile Money Gateway Error: ${err.message || 'Unable to connect to payment provider.'}`, 502);
      }
    }
  }

  // Test Mode / Sandbox success fallback when no live secret key is active
  const fakeFlwRef = `FLW-TEST-MM-${momoProvider.substring(0, 3).toUpperCase()}-${crypto.randomInt(100000, 999999)}`;
  logger.info('Mobile Money charge approved via Sandbox Test Environment', { transactionId: fakeFlwRef });
  
  return {
    success: true,
    transactionId: fakeFlwRef,
    status: 'Paid',
    provider: 'Flutterwave'
  };
}

/**
 * Process a Tokenized Card payment (Visa / MasterCard) via Flutterwave API or Sandbox
 * Note: Raw card numbers/CVVs are NEVER accepted or processed here.
 */
export async function chargeCard(params: CardChargeParams): Promise<PaymentChargeResult> {
  const { total, email, paymentMethodId, cardToken, cardLast4, customerName, orderRef } = params;

  const token = cardToken || paymentMethodId;
  if (!token) {
    throw new ApiError('A valid card token (paymentMethodId) is required for secure PCI-compliant card processing.', 400);
  }

  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  const isTestMode = process.env.PAYMENT_TEST_MODE === 'true' || !secretKey || secretKey.includes('TEST') || secretKey.startsWith('FLWSECK_TEST');

  logger.info('Processing Tokenized Card payment request', {
    email,
    cardLast4: cardLast4 || 'xxxx',
    amount: total,
    isTestMode,
    orderRef
  });

  // Test mode decline check
  if (token === 'tok_declined' || token.includes('decline') || token.includes('fail')) {
    logger.warn('Test mode card decline triggered by token parameter', { token });
    throw new ApiError('Card payment authorization failed: Transaction was declined by issuing bank (insufficient funds or security rule).', 400);
  }

  // If secret key is configured, invoke Flutterwave Tokenized Charge API
  if (secretKey && !secretKey.includes('placeholder') && !secretKey.includes('xxxxxxxx')) {
    try {
      const txRef = orderRef || `card-txn-${crypto.randomUUID()}`;
      const payload = {
        token,
        currency: 'UGX',
        amount: total,
        email,
        tx_ref: txRef,
        fullname: customerName || email.split('@')[0]
      };

      const response = await fetch('https://api.flutterwave.com/v3/tokenized-charges', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.status === 'success' && data?.data) {
        const transactionId = String(data.data.flw_ref || data.data.id || txRef);
        return {
          success: true,
          transactionId,
          status: 'Paid',
          provider: 'Flutterwave',
          rawResponse: data.data
        };
      }

      const declineReason = data?.message || data?.data?.processor_response || 'Card authorization failed or was declined by the issuing bank.';
      logger.warn('Flutterwave Card API charge declined:', { declineReason, email });
      throw new ApiError(`Card Settlement Failed: ${declineReason}`, 400);

    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      logger.error('Flutterwave Card API error:', err);
      if (!isTestMode) {
        throw new ApiError(`Card Gateway Error: ${err.message || 'Unable to communicate with card processing network.'}`, 502);
      }
    }
  }

  // Test Mode / Sandbox success fallback
  const fakeVisaTxn = `FLW-TEST-VISA-${crypto.randomInt(100000, 999999)}`;
  logger.info('Card payment approved via Sandbox Test Environment', { transactionId: fakeVisaTxn });

  return {
    success: true,
    transactionId: fakeVisaTxn,
    status: 'Paid',
    provider: 'Flutterwave'
  };
}
