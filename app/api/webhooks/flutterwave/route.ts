import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/apiUtils';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('verif-hash') || req.headers.get('verif_hash');
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET_HASH || process.env.FLUTTERWAVE_SECRET_KEY;

    // Verify webhook signature when live mode is active (PAYMENT_TEST_MODE !== 'true') and secretHash is configured.
    // Explicit environment flag check ensures consistent behavior across dev/staging/prod without relying on NODE_ENV alone.
    const isLiveWebhookVerification = secretHash && process.env.PAYMENT_TEST_MODE !== 'true';
    if (isLiveWebhookVerification) {
      const sigBuf = signature ? Buffer.from(signature, 'utf8') : null;
      const secretBuf = Buffer.from(secretHash, 'utf8');
      const isValid = sigBuf && sigBuf.length === secretBuf.length && crypto.timingSafeEqual(sigBuf, secretBuf);
      if (!isValid) {
        logger.warn('Flutterwave webhook signature verification failed', { signatureReceived: !!signature });
        return NextResponse.json({ error: 'Unauthorized webhook signature' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { event, data } = body;

    logger.info('Flutterwave webhook event received', { event, txRef: data?.tx_ref, flwRef: data?.flw_ref, status: data?.status });

    if (!data) {
      return NextResponse.json({ status: 'ignored', message: 'No payload data found' }, { status: 200 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const flwRef = String(data.flw_ref || data.id || data.tx_ref || '');
    const txRef = String(data.tx_ref || '');
    const paymentStatus = data.status === 'successful' ? 'success' : 'failed';
    const orderStatus = data.status === 'successful' ? 'processing' : 'cancelled';

    // 1. Find matching payment record
    const { data: paymentRecord, error: searchErr } = await supabase
      .from('payments')
      .select('*')
      .or(`transaction_id.eq.${flwRef},transaction_id.eq.${txRef}`)
      .single();

    if (searchErr) {
      logger.warn('Flutterwave webhook payment lookup error or unmatched record:', { searchErr, flwRef, txRef });
    }

    if (paymentRecord) {
      // Update payment status
      const { error: payUpdErr } = await supabase
        .from('payments')
        .update({
          status: paymentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id);

      if (payUpdErr) {
        logger.error('Failed to update payment record from webhook:', payUpdErr);
      }

      // Update matching order status
      let orderUpdErr: any = null;
      if (paymentRecord.order_id) {
        const { error: err } = await supabase
          .from('orders')
          .update({
            status: orderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentRecord.order_id);
        orderUpdErr = err;
        if (orderUpdErr) {
          logger.error('Failed to update order record from webhook:', orderUpdErr);
        }
      }

      if (payUpdErr || orderUpdErr) {
        return NextResponse.json(
          { error: 'Failed to update payment or order status in database' },
          { status: 502 }
        );
      }

      // Log webhook action to audit log
      await supabase
        .from('audit_logs')
        .insert({
          action: 'Webhook Payment Update',
          details: `Flutterwave webhook updated Payment ${paymentRecord.id} to '${paymentStatus}' and Order ${paymentRecord.order_id} to '${orderStatus}'.`,
          ip_address: req.headers.get('x-forwarded-for') || 'flutterwave-webhook'
        });

      return NextResponse.json({ status: 'success', message: 'Payment and order updated successfully' }, { status: 200 });
    }

    // 2. Fallback: Search order by order_number if tx_ref matches order_number format
    if (txRef) {
      const { data: orderRecord } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', txRef)
        .single();

      if (orderRecord) {
        const { error: orderUpdErr } = await supabase
          .from('orders')
          .update({
            status: orderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderRecord.id);

        if (orderUpdErr) {
          logger.error('Failed to update order record from webhook fallback:', orderUpdErr);
          return NextResponse.json(
            { error: 'Failed to update order status in database' },
            { status: 502 }
          );
        }

        return NextResponse.json({ status: 'success', message: 'Order status updated via tx_ref match' }, { status: 200 });
      }
    }

    logger.info('Flutterwave webhook received for unlinked transaction', { txRef, flwRef });
    return NextResponse.json({ status: 'acknowledged', message: 'Webhook received' }, { status: 200 });

  } catch (err: any) {
    logger.error('Error processing Flutterwave webhook:', err);
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
