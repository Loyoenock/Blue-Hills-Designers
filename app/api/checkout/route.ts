import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError, authenticate } from '@/lib/apiUtils';
import { sendTransactionalEmail } from '@/lib/email';
import crypto from 'crypto';

// Standard Kampala luxury coupons
const VALID_COUPONS = [
  { code: 'WELCOME10', discountType: 'percentage', discountValue: 10 },
  { code: 'GENTLEMAN20', discountType: 'percentage', discountValue: 20 },
  { code: 'SAVILEROW50', discountType: 'fixed', discountValue: 50 },
  { code: 'KAMPALA30', discountType: 'percentage', discountValue: 30 },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (60 checkout attempts per minute max)
    await enforceRateLimit(req, 60, 60000);

    const body = await req.json().catch(() => ({}));
    
    // 2. Validate essential inputs
    validateFields(body, {
      email: 'email',
      phone: 'string',
      paymentMethod: 'string'
    });

    const {
      cart,
      appliedCoupon,
      selectedShippingMethod,
      email,
      phone,
      customerName,
      shippingAddress,
      paymentMethod,
      paymentDetails
    } = body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      throw new ApiError('Your cart is empty. Please add items to checkout.', 400);
    }
    
    if (!shippingAddress || !shippingAddress.city || !shippingAddress.address) {
      throw new ApiError('Complete shipping address is required.', 400);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new ApiError('Database service is currently unavailable.', 500);
    }

    // 3. User Authentication Verification (via Bearer token in request header)
    const authUser = await authenticate(req);
    const authenticatedUserId = authUser?.id || null;
    const userRole = authUser?.role || 'Customer';

    logger.info('Checkout request received', {
      email,
      authenticatedUserId,
      userRole,
      cartSize: cart.length,
      paymentMethod
    });

    // 4. Validate Inventory & Prices from database
    const validatedCartItems = [];
    let subtotal = 0;

    for (const item of cart) {
      const productId = item.product?.id;
      if (!productId) {
        throw new ApiError('Invalid product entry in cart.', 400);
      }

      // Query database for the fresh, authoritative stock level & price
      const { data: product, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (prodErr || !product) {
        throw new ApiError(`Product "${item.product?.name || productId}" could not be verified in our atelier registry.`, 400);
      }

      // Verify stock level
      if (product.stock < item.quantity) {
        throw new ApiError(`Apologies, "${product.name}" has insufficient stock. Available stock is ${product.stock} units, while you requested ${item.quantity}.`, 400);
      }

      const itemPrice = Number(product.price) || 0;
      const itemCost = itemPrice * item.quantity;
      subtotal += itemCost;

      validatedCartItems.push({
        id: item.id || `${productId}-${item.selectedSize}-${item.selectedColor}`,
        product,
        quantity: item.quantity,
        price: itemPrice,
        selectedSize: item.selectedSize || 'M',
        selectedColor: item.selectedColor || 'Default',
        image: product.images?.[0] || item.product?.images?.[0] || ''
      });
    }

    // 5. Calculate final invoice details autoritatively on the server
    let couponDiscount = 0;
    let validatedCoupon = null;

    if (appliedCoupon) {
      const sanitizedCode = appliedCoupon.code?.trim().toUpperCase();
      const serverCoupon = VALID_COUPONS.find(c => c.code === sanitizedCode);
      if (serverCoupon) {
        validatedCoupon = serverCoupon;
        if (serverCoupon.discountType === 'percentage') {
          couponDiscount = Math.round(subtotal * (serverCoupon.discountValue / 100));
        } else if (serverCoupon.discountType === 'fixed') {
          couponDiscount = serverCoupon.discountValue;
        }
      }
    }

    let deliveryFee = 0;
    if (selectedShippingMethod === 'standard') {
      const threshold = 2000; // standard Ugx threshold
      deliveryFee = subtotal > threshold ? 0 : 50;
    } else if (selectedShippingMethod === 'express') {
      deliveryFee = 120;
    } else if (selectedShippingMethod === 'pickup') {
      deliveryFee = 0;
    }

    const total = Math.max(0, subtotal - couponDiscount + deliveryFee);
    const taxRate = 18; // VAT 18% inclusive
    const taxableAmount = subtotal - couponDiscount;
    const taxAmount = Math.round((taxableAmount / (1 + taxRate / 100)) * (taxRate / 100));

    // 6. Secure Payment Gateway handshake simulation
    await delay(1000); // 1-second delay representing a secure external merchant handshake

    let transactionId = 'COD-PENDING';
    let paymentStatus = 'Pending';

    if (paymentMethod === 'Mobile Money') {
      const momoProvider = paymentDetails?.momoProvider || 'MTN';
      const momoNumber = paymentDetails?.momoNumber;
      if (!momoNumber || momoNumber.trim().length < 9) {
        throw new ApiError('A valid Mobile Money wallet number is required to process MTN/Airtel escrow holds.', 400);
      }
      
      /* 
       * PRODUCTION INTEGRATION SETUP FOR MOBILE MONEY (MTN MoMo API / Airtel Money / Flutterwave)
       * ---------------------------------------------------------------------------------------
       * To go live, replace this simulation block with a request to your payment aggregator.
       * Example using Flutterwave Node SDK or Axios HTTP call:
       * 
       * const chargePayload = {
       *   tx_ref: `momo-txn-${crypto.randomUUID()}`,
       *   amount: total,
       *   currency: "UGX",
       *   email: email,
       *   phone_number: momoNumber,
       *   network: momoProvider.toUpperCase(),
       *   type: "mobile_money_ugandabills"
       * };
       * 
       * const response = await axios.post('https://api.flutterwave.com/v3/charges?type=mobile_money_ugandabills', chargePayload, {
       *   headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
       * });
       * 
       * if (response.data.status === 'success') {
       *   transactionId = response.data.data.id;
       *   paymentStatus = 'Paid';
       * } else {
       *   throw new ApiError('Mobile Money transaction was declined by the carrier escrow gateway.', 400);
       * }
       */
      transactionId = `TXN-MM-${momoProvider.substring(0, 3).toUpperCase()}-${crypto.randomInt(100000, 999999)}`;
      paymentStatus = 'Paid';
    } else if (paymentMethod === 'Visa') {
      const cardNumber = paymentDetails?.cardNumber;
      const cardExpiry = paymentDetails?.cardExpiry;
      const cardCVV = paymentDetails?.cardCVV;
      if (!cardNumber || cardNumber.trim().replace(/\s/g, '').length < 16) {
        throw new ApiError('A valid 16-digit Visa/MasterCard card number is required.', 400);
      }
      if (!cardExpiry || !cardExpiry.includes('/')) {
        throw new ApiError('Invalid card expiration date (MM/YY).', 400);
      }
      if (!cardCVV || cardCVV.trim().length < 3) {
        throw new ApiError('A valid 3-digit CVV security code is required.', 400);
      }

      /* 
       * PRODUCTION INTEGRATION SETUP FOR CARD PAYMENTS (Stripe / Flutterwave / Rave)
       * ---------------------------------------------------------------------------
       * To go live, replace this simulation block with Stripe Token/PaymentIntent confirmation:
       * 
       * import Stripe from 'stripe';
       * const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
       * 
       * const paymentIntent = await stripe.paymentIntents.create({
       *   amount: total, // convert to smallest currency unit if needed (e.g., cents)
       *   currency: 'ugx',
       *   payment_method: paymentDetails.stripePaymentMethodId,
       *   confirm: true,
       *   return_url: `${req.nextUrl.origin}/checkout/confirm`,
       * });
       * 
       * if (paymentIntent.status === 'succeeded') {
       *   transactionId = paymentIntent.id;
       *   paymentStatus = 'Paid';
       * } else {
       *   throw new ApiError('Card authorization failed or was declined by the issuing bank.', 400);
       * }
       */
      transactionId = `TXN-VISA-${crypto.randomInt(100000, 999999)}`;
      paymentStatus = 'Paid';
    }

    // 7. Transactional database updates (Products inventory, Orders, Items, Address, Payments)
    const orderNumber = `ORD-${crypto.randomInt(1000, 9999)}`;
    const orderUUID = crypto.randomUUID();

    const rolledBackItems: { productId: string; originalStock: number }[] = [];

    try {
      logger.info('Reducing inventory stock with atomic rollback safeguards', { orderNumber });
      // Step A: Decrement inventory stock on products atomically (optimistic conditional locking)
      for (const item of validatedCartItems) {
        const { data: updatedProduct, error: updateErr } = await supabase
          .from('products')
          .update({ stock: item.product.stock - item.quantity, updated_at: new Date().toISOString() })
          .eq('id', item.product.id)
          .gte('stock', item.quantity) // Conditional update ensuring sufficient stock is still available!
          .select()
          .single();

        if (updateErr || !updatedProduct) {
          throw new Error(`Inventory reservation failed for "${item.product.name}". High request density: stock was depleted or changed. Please try checking out again.`);
        }
        rolledBackItems.push({ productId: item.product.id, originalStock: item.product.stock });
      }

      // Step B: Insert shipping order details
      const { error: orderErr } = await supabase
        .from('orders')
        .insert({
          id: orderUUID,
          user_id: authenticatedUserId,
          order_number: orderNumber,
          amount: total,
          status: 'pending',
          payment_method: paymentMethod,
          notes: paymentMethod === 'Mobile Money' 
            ? `MoMo Operator: ${paymentDetails?.momoProvider}, Wallet: ${paymentDetails?.momoNumber}` 
            : paymentMethod === 'Visa' 
              ? `Visa card ending with ${paymentDetails?.cardNumber?.slice(-4)}` 
              : 'Settle in cash/mobile money upon showroom delivery fitting.'
        });

      if (orderErr) {
        throw new Error(`Failed to log checkout order details: ${orderErr.message}`);
      }

      // Step C: Insert individual ordered items
      for (const item of validatedCartItems) {
        const { error: itemErr } = await supabase
          .from('order_items')
          .insert({
            order_id: orderUUID,
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.price
          });

        if (itemErr) {
          throw new Error(`Failed to log checkout order item "${item.product.name}": ${itemErr.message}`);
        }
      }

      // Step D: Insert physical shipping details
      const { error: addressErr } = await supabase
        .from('order_addresses')
        .insert({
          order_id: orderUUID,
          country: shippingAddress.country || 'Uganda',
          district: shippingAddress.district || shippingAddress.city,
          city: shippingAddress.city,
          address: shippingAddress.address
        });

      if (addressErr) {
        throw new Error(`Failed to log checkout shipping address: ${addressErr.message}`);
      }

      // Step E: Insert payment transaction record
      const { error: paymentErr } = await supabase
        .from('payments')
        .insert({
          order_id: orderUUID,
          provider: paymentMethod,
          transaction_id: transactionId,
          amount: total,
          status: paymentStatus === 'Paid' ? 'success' : 'pending'
        });

      if (paymentErr) {
        throw new Error(`Failed to log checkout transaction payment: ${paymentErr.message}`);
      }

      // Step F: If user is authenticated, update profile loyalty metrics
      if (authenticatedUserId) {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authenticatedUserId)
          .single();

        if (!profErr && profile) {
          const currentSpending = Number(profile.lifetime_spending) || 0;
          const currentPoints = Number(profile.reward_points) || 0;
          const pointsEarned = Math.floor(taxableAmount * 0.1);

          await supabase
            .from('profiles')
            .update({
              lifetime_spending: currentSpending + total,
              reward_points: currentPoints + pointsEarned,
              updated_at: new Date().toISOString()
            })
            .eq('id', authenticatedUserId);
        }
      }

      // Step G: Log checkout security audit telemetry
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
      await supabase
        .from('audit_logs')
        .insert({
          user_id: authenticatedUserId,
          action: 'Checkout Success',
          details: `Checkout successfully processed for Order ${orderNumber} totaling Ugx ${total}. Payment: ${paymentMethod}, Status: ${paymentStatus}.`,
          ip_address: ip
        });

    } catch (dbErr: any) {
      logger.error('Checkout transactional DB failure, initiating stock rollbacks', dbErr);

      // Rollback: Restore original stock levels on failure
      for (const rollback of rolledBackItems) {
        try {
          await supabase
            .from('products')
            .update({ stock: rollback.originalStock })
            .eq('id', rollback.productId);
          logger.info(`Successfully restored original stock for product ${rollback.productId} to ${rollback.originalStock}`);
        } catch (rollErr) {
          logger.error(`Rollback stock failure for product ${rollback.productId}`, rollErr);
        }
      }

      throw new ApiError(`Sartorial checkout failure: ${dbErr.message || dbErr}. All product reservations have been rolled back safely.`, 500);
    }

    // 8. Generate plain-text / HTML email invoice confirmation
    const emailSubject = `Order Confirmed [${orderNumber}] - Savile Row & Lubowa Showroom`;
    
    const emailHtml = `
      <div style="font-family: Garamond, Georgia, serif; background-color: #F7F5F0; padding: 40px; color: #1D2B3F; max-width: 600px; margin: 0 auto; border: 1px solid #65789230; border-radius: 12px;">
        <div style="text-align: center; border-bottom: 2px solid #C6A15B; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="font-size: 24px; letter-spacing: 2px; text-transform: uppercase; margin: 0; font-weight: normal; color: #1D2B3F;">Savile Row Atelier</h1>
          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #C6A15B; margin: 5px 0 0 0;">Lubowa Showroom Kampala</p>
        </div>

        <p style="font-size: 14px; font-style: italic; text-align: center;">Dear Distinguished Client,</p>
        <p style="font-size: 13px; line-height: 1.6; text-align: center; font-weight: 300;">
          We are pleased to confirm your sartorial purchase details. Your order has been registered under <strong>${orderNumber}</strong> and is currently being hand-bagged and processed for white-glove delivery dispatch.
        </p>

        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #65789215;">
          <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #C6A15B; border-bottom: 1px solid #65789215; padding-bottom: 5px; margin-top: 0;">Sartorial Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="border-bottom: 1px solid #65789215; color: #657892;">
                <th style="text-align: left; padding: 8px 0; font-weight: normal;">Garment Item</th>
                <th style="text-align: center; padding: 8px 0; font-weight: normal;">Qty</th>
                <th style="text-align: right; padding: 8px 0; font-weight: normal;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${validatedCartItems.map(item => `
                <tr style="border-bottom: 1px solid #65789208;">
                  <td style="padding: 10px 0;">
                    <div style="font-weight: 600;">${item.product.name}</div>
                    <div style="font-size: 10px; color: #657892;">Size: ${item.selectedSize} / Color: ${item.selectedColor}</div>
                  </td>
                  <td style="text-align: center; padding: 10px 0;">${item.quantity}</td>
                  <td style="text-align: right; padding: 10px 0; font-family: monospace;">Ugx ${item.price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 15px; border-top: 1px solid #65789215; padding-top: 15px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #657892;">Atelier Subtotal:</span>
              <strong style="margin-left: auto; font-family: monospace;">Ugx ${subtotal}</strong>
            </div>
            ${validatedCoupon ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #10b981;">
                <span>Atelier Code Discount (${validatedCoupon.code}):</span>
                <strong style="margin-left: auto; font-family: monospace;">-Ugx ${couponDiscount}</strong>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span style="color: #657892;">Courier Protocol:</span>
              <strong style="margin-left: auto; font-family: monospace;">${deliveryFee === 0 ? 'Complimentary' : `Ugx ${deliveryFee}`}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #65789215; padding-bottom: 10px;">
              <span style="color: #657892;">VAT Included (18%):</span>
              <strong style="margin-left: auto; font-family: monospace; font-weight: normal;">Ugx ${taxAmount}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 15px; color: #1D2B3F; margin-top: 10px;">
              <span>Total Invoice Amount:</span>
              <strong style="margin-left: auto; font-family: monospace; color: #1D2B3F; font-size: 16px;">Ugx ${total}</strong>
            </div>
          </div>
        </div>

        <div style="font-size: 11px; line-height: 1.5; color: #657892; background-color: #B9CDE510; padding: 15px; border-radius: 8px; border: 1px dashed #65789220; margin-bottom: 25px;">
          <h4 style="margin: 0 0 5px 0; color: #1D2B3F; font-size: 11px; text-transform: uppercase;">Delivery & Escrow Details</h4>
          <p style="margin: 0;"><strong>Recipient Contact:</strong> ${phone}</p>
          <p style="margin: 3px 0 0 0;"><strong>Destination:</strong> ${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.district || shippingAddress.city}, ${shippingAddress.country}</p>
          <p style="margin: 3px 0 0 0;"><strong>Settlement Method:</strong> ${paymentMethod} (${paymentStatus === 'Paid' ? `Authorized under ID: ${transactionId}` : 'Pay upon showroom physical fitting confirmation'})</p>
        </div>

        <div style="text-align: center; font-size: 11px; color: #657892; border-top: 1px solid #65789215; padding-top: 20px; margin-top: 30px;">
          <p style="margin: 0 0 5px 0;">Savile Row Designers Uganda • Lubowa Showroom</p>
          <p style="margin: 0;">Private Advisory Line: +256 772 120120 • 24/7 Concierge Service</p>
        </div>
      </div>
    `;

    // 9. Dispatch order confirmation email (best-effort, non-blocking)
    let emailDispatched = false;
    let emailDeliveryError: string | null = null;
    try {
      const emailResult = await sendTransactionalEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
        orderNumber,
      });
      emailDispatched = emailResult.success;
      if (!emailResult.success) {
        emailDeliveryError = emailResult.error || 'Failed to dispatch email';
      }
    } catch (emailErr: any) {
      logger.error('Unexpected exception during order confirmation email dispatch:', emailErr);
      emailDeliveryError = emailErr?.message || 'Email service exception';
    }

    return NextResponse.json({
      success: true,
      orderNumber,
      orderUUID,
      invoice: {
        subtotal,
        discount: couponDiscount,
        deliveryFee,
        tax: taxAmount,
        total,
        currencySymbol: 'Ugx'
      },
      payment: {
        method: paymentMethod,
        transactionId,
        status: paymentStatus
      },
      emailDispatched,
      emailDeliveryError,
      emailHtml,
      emailSubject
    });

  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
