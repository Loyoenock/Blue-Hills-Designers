import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError, authenticate } from '@/lib/apiUtils';
import { sendTransactionalEmail } from '@/lib/email';
import { chargeMobileMoney, chargeCard } from '@/lib/payment';
import crypto from 'crypto';

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
      paymentDetails,
      idempotencyKey
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

    // Verify payment method against app_settings singleton
    const { data: dbSettings } = await supabase
      .from('app_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (dbSettings) {
      if (paymentMethod === 'Mobile Money' && dbSettings.payment_method_mobile_money === false) {
        throw new ApiError('This payment method is currently unavailable.', 400);
      }
      if (paymentMethod === 'Visa' && dbSettings.payment_method_visa === false) {
        throw new ApiError('This payment method is currently unavailable.', 400);
      }
      if (paymentMethod === 'Cash on Delivery' && dbSettings.payment_method_cash_on_delivery === false) {
        throw new ApiError('This payment method is currently unavailable.', 400);
      }
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
    let validatedCoupon: any = null;

    if (appliedCoupon) {
      const sanitizedCode = appliedCoupon.code?.trim().toUpperCase();
      if (sanitizedCode) {
        const { data: serverCoupon, error: couponErr } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', sanitizedCode)
          .eq('is_active', true)
          .maybeSingle();

        if (couponErr) {
          logger.warn('Error querying coupon from DB during checkout', { couponErr, code: sanitizedCode });
        }

        if (!serverCoupon) {
          throw new ApiError(`Applied coupon "${sanitizedCode}" is invalid or inactive.`, 400);
        }

        // Enforce expiration
        if (serverCoupon.expires_at) {
          const expiryDate = new Date(serverCoupon.expires_at);
          if (!isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now()) {
            throw new ApiError(`Coupon code "${sanitizedCode}" has expired.`, 400);
          }
        }

        // Enforce usage limit
        if (serverCoupon.usage_limit !== null && serverCoupon.usage_limit !== undefined) {
          const limit = Number(serverCoupon.usage_limit);
          const used = Number(serverCoupon.times_used) || 0;
          if (used >= limit) {
            throw new ApiError(`Coupon code "${sanitizedCode}" has reached its usage limit.`, 400);
          }
        }

        // Enforce minimum subtotal
        if (serverCoupon.min_subtotal !== null && serverCoupon.min_subtotal !== undefined) {
          const minSub = Number(serverCoupon.min_subtotal);
          if (minSub > 0 && subtotal < minSub) {
            throw new ApiError(`Coupon "${sanitizedCode}" requires a minimum subtotal of Ugx ${minSub}.`, 400);
          }
        }

        validatedCoupon = serverCoupon;
        const discountVal = Number(serverCoupon.discount_value) || 0;
        if (serverCoupon.discount_type === 'percentage') {
          couponDiscount = Math.round(subtotal * (discountVal / 100));
        } else if (serverCoupon.discount_type === 'fixed') {
          couponDiscount = discountVal;
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

    // 5.5 Idempotency Check: Prevent duplicate payment charge or duplicate order creation
    if (idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        logger.info('Duplicate checkout submission detected via idempotencyKey, returning existing order details', {
          idempotencyKey,
          orderNumber: existingOrder.order_number
        });

        const { data: paymentRecord } = await supabase
          .from('payments')
          .select('*')
          .eq('order_id', existingOrder.id)
          .maybeSingle();

        const txnId = paymentRecord?.transaction_id || 'COD-PENDING';
        const pStatus = paymentRecord?.status === 'success' ? 'Paid' : (paymentRecord?.status || 'Pending');

        return NextResponse.json({
          success: true,
          orderNumber: existingOrder.order_number,
          orderUUID: existingOrder.id,
          invoice: {
            subtotal,
            discount: couponDiscount,
            deliveryFee,
            tax: taxAmount,
            total: Number(existingOrder.amount) || total,
            currencySymbol: 'Ugx'
          },
          payment: {
            method: existingOrder.payment_method || paymentMethod,
            transactionId: txnId,
            status: pStatus
          },
          emailDispatched: true,
          emailDeliveryError: null,
          emailHtml: '',
          emailSubject: `Order Confirmed [${existingOrder.order_number}] - Savile Row & Lubowa Showroom`
        });
      }
    }

    // 6. Execute Payment Charge BEFORE inventory decrement or DB order creation
    // If payment authorization fails/declines, chargeMobileMoney/chargeCard throws an ApiError,
    // stopping execution immediately BEFORE any inventory stock is modified or orders created.
    const tempOrderRef = `ORD-REF-${crypto.randomInt(1000, 9999)}`;
    let transactionId = 'COD-PENDING';
    let paymentStatus = 'Pending';
    let paymentProvider = 'Cash on Delivery';

    if (paymentMethod === 'Mobile Money') {
      const momoProvider = paymentDetails?.momoProvider || 'MTN';
      const momoNumber = paymentDetails?.momoNumber;
      
      const chargeRes = await chargeMobileMoney({
        total,
        email,
        momoNumber,
        momoProvider,
        customerName,
        orderRef: tempOrderRef
      });

      transactionId = chargeRes.transactionId;
      paymentStatus = chargeRes.status;
      paymentProvider = chargeRes.provider;

    } else if (paymentMethod === 'Visa') {
      const cardToken = paymentDetails?.cardToken || paymentDetails?.paymentMethodId;
      const cardLast4 = paymentDetails?.cardLast4;

      const chargeRes = await chargeCard({
        total,
        email,
        cardToken,
        paymentMethodId: cardToken,
        cardLast4,
        customerName,
        orderRef: tempOrderRef
      });

      transactionId = chargeRes.transactionId;
      paymentStatus = chargeRes.status;
      paymentProvider = chargeRes.provider;
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

      // Steps B through H: Execute atomic order creation transaction in PL/pgSQL
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
      const orderNotes = paymentMethod === 'Mobile Money' 
        ? `MoMo Operator: ${paymentDetails?.momoProvider || 'MTN'}, Wallet: ${paymentDetails?.momoNumber || 'N/A'}` 
        : paymentMethod === 'Visa' 
          ? `Visa card ending with ${paymentDetails?.cardLast4 || 'xxxx'}` 
          : 'Settle in cash/mobile money upon showroom delivery fitting.';

      const { error: orderTxErr } = await supabase.rpc('create_checkout_order', {
        p_order_id: orderUUID,
        p_user_id: authenticatedUserId || null,
        p_order_number: orderNumber,
        p_amount: total,
        p_payment_method: paymentMethod,
        p_idempotency_key: idempotencyKey || null,
        p_notes: orderNotes,
        p_items: validatedCartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price
        })),
        p_shipping: {
          country: shippingAddress.country || 'Uganda',
          district: shippingAddress.district || shippingAddress.city,
          city: shippingAddress.city,
          address: shippingAddress.address
        },
        p_payment_provider: paymentProvider || paymentMethod,
        p_transaction_id: transactionId,
        p_payment_status: paymentStatus,
        p_points_earned: Math.floor(taxableAmount * 0.1),
        p_coupon_id: (validatedCoupon && validatedCoupon.id) ? validatedCoupon.id : null,
        p_ip_address: ip
      });

      if (orderTxErr) {
        throw new Error(`Failed to log checkout order details: ${orderTxErr.message}`);
      }

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

      throw new ApiError(`Checkout DB failure: ${dbErr.message || dbErr}. All product reservations have been rolled back safely.`, 500);
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
