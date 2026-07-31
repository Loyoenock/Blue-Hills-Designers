import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError, authenticate } from '@/lib/apiUtils';
import { sendTransactionalEmail } from '@/lib/email';
import { chargeMobileMoney, chargeCard } from '@/lib/payment';
import crypto from 'crypto';

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

    // Calculate total requested quantity per product ID to handle multiple line items/variants of the same product
    const productTotalsMap: Record<string, number> = {};
    for (const item of cart) {
      const productId = item.product?.id;
      if (!productId) {
        throw new ApiError('Invalid product entry in cart.', 400);
      }
      const qty = Number(item.quantity) || 0;
      productTotalsMap[productId] = (productTotalsMap[productId] || 0) + qty;
    }

    const fetchedProductsCache: Record<string, any> = {};

    for (const item of cart) {
      const productId = item.product.id;

      // Query database for fresh, authoritative stock level & price if not cached in this request
      if (!fetchedProductsCache[productId]) {
        const { data: product, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (prodErr || !product) {
          throw new ApiError(`Product "${item.product?.name || productId}" could not be verified in our atelier registry.`, 400);
        }
        fetchedProductsCache[productId] = product;
      }

      const product = fetchedProductsCache[productId];
      const totalRequestedQuantity = productTotalsMap[productId];

      // Verify combined stock level for this product across all cart variants
      if (product.stock < totalRequestedQuantity) {
        throw new ApiError(`Apologies, "${product.name}" has insufficient stock. Available stock is ${product.stock} units, while you requested ${totalRequestedQuantity}.`, 400);
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

    let freeShippingThreshold = 2000; // default standard Ugx threshold
    if (dbSettings && dbSettings.free_shipping_threshold !== undefined && dbSettings.free_shipping_threshold !== null) {
      const parsedThreshold = Number(dbSettings.free_shipping_threshold);
      if (Number.isFinite(parsedThreshold) && parsedThreshold >= 0) {
        freeShippingThreshold = parsedThreshold;
      } else {
        logger.warn('Invalid free_shipping_threshold in app_settings, falling back to default 2000', {
          val: dbSettings.free_shipping_threshold
        });
      }
    }

    const courierFees = {
      standard: dbSettings?.courier_standard_fee !== undefined && dbSettings?.courier_standard_fee !== null ? Number(dbSettings.courier_standard_fee) : 50,
      express: dbSettings?.courier_express_fee !== undefined && dbSettings?.courier_express_fee !== null ? Number(dbSettings.courier_express_fee) : 120,
      pickup: dbSettings?.courier_pickup_fee !== undefined && dbSettings?.courier_pickup_fee !== null ? Number(dbSettings.courier_pickup_fee) : 0,
    };

    const courierMethods = {
      standard: dbSettings?.courier_method_standard !== undefined && dbSettings?.courier_method_standard !== null ? !!dbSettings.courier_method_standard : true,
      express: dbSettings?.courier_method_express !== undefined && dbSettings?.courier_method_express !== null ? !!dbSettings.courier_method_express : true,
      pickup: dbSettings?.courier_method_pickup !== undefined && dbSettings?.courier_method_pickup !== null ? !!dbSettings.courier_method_pickup : true,
    };

    if (selectedShippingMethod === 'standard' && !courierMethods.standard) {
      throw new ApiError('Selected BHD Courier Method (Standard) is currently disabled.', 400);
    }
    if (selectedShippingMethod === 'express' && !courierMethods.express) {
      throw new ApiError('Selected BHD Courier Method (Express) is currently disabled.', 400);
    }
    if (selectedShippingMethod === 'pickup' && !courierMethods.pickup) {
      throw new ApiError('Selected BHD Courier Method (Pickup) is currently disabled.', 400);
    }

    let deliveryFee = 0;
    if (selectedShippingMethod === 'standard') {
      deliveryFee = subtotal > freeShippingThreshold ? 0 : courierFees.standard;
    } else if (selectedShippingMethod === 'express') {
      deliveryFee = courierFees.express;
    } else if (selectedShippingMethod === 'pickup') {
      deliveryFee = courierFees.pickup;
    }

    let taxRate = 18; // default VAT 18% inclusive
    if (dbSettings && dbSettings.tax_rate !== undefined && dbSettings.tax_rate !== null) {
      const parsedTaxRate = Number(dbSettings.tax_rate);
      if (Number.isFinite(parsedTaxRate) && parsedTaxRate >= 0 && parsedTaxRate <= 100) {
        taxRate = parsedTaxRate;
      } else {
        logger.warn('Invalid tax_rate in app_settings, falling back to default 18', {
          val: dbSettings.tax_rate
        });
      }
    }

    const total = Math.max(0, subtotal - couponDiscount + deliveryFee);
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

    // 7. Transactional database updates (Products stock reservation, Orders, Items, Address, Payments in PL/pgSQL)
    const orderNumber = `ORD-${crypto.randomInt(1000, 9999)}`;
    const orderUUID = crypto.randomUUID();

    try {
      logger.info('Executing atomic checkout transaction in DB via create_checkout_order RPC', { orderNumber });
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
        if (orderTxErr.message?.includes('Insufficient stock')) {
          throw new ApiError('Apologies, one or more items in your cart became out of stock during checkout. Please review your cart.', 400);
        }
        throw new Error(`Failed to process checkout transaction: ${orderTxErr.message}`);
      }

    } catch (dbErr: any) {
      logger.error('Checkout transactional DB failure', dbErr);

      // Best-effort insert into reconciliation_flags for manual payment reconciliation if payment was charged
      try {
        await supabase
          .from('reconciliation_flags')
          .insert({
            transaction_id: transactionId,
            email,
            amount: total,
            payment_provider: paymentProvider,
            raw_error: String(dbErr?.message || dbErr)
          });
        logger.info('Logged payment reconciliation flag for checkout failure', { transactionId, email });
      } catch (recErr) {
        logger.error('Failed to log reconciliation flag during checkout error handling', recErr);
      }

      if (dbErr instanceof ApiError) {
        throw dbErr;
      }

      throw new ApiError(`Checkout DB failure: ${dbErr.message || dbErr}`, 500);
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
          We are pleased to confirm your sartorial purchase details. Your order has been registered under <strong>${escapeHtml(orderNumber)}</strong> and is currently being hand-bagged and processed for white-glove delivery dispatch.
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
                    <div style="font-weight: 600;">${escapeHtml(item.product.name)}</div>
                    <div style="font-size: 10px; color: #657892;">Size: ${escapeHtml(item.selectedSize)} / Color: ${escapeHtml(item.selectedColor)}</div>
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
                <span>Atelier Code Discount (${escapeHtml(validatedCoupon.code)}):</span>
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
          <p style="margin: 0;"><strong>Recipient Contact:</strong> ${escapeHtml(phone)}</p>
          <p style="margin: 3px 0 0 0;"><strong>Destination:</strong> ${escapeHtml(shippingAddress.address)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.district || shippingAddress.city)}, ${escapeHtml(shippingAddress.country)}</p>
          <p style="margin: 3px 0 0 0;"><strong>Settlement Method:</strong> ${escapeHtml(paymentMethod)} (${paymentStatus === 'Paid' ? `Authorized under ID: ${escapeHtml(transactionId)}` : 'Pay upon showroom physical fitting confirmation'})</p>
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
