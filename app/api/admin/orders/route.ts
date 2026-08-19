import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, enforceRateLimit, createErrorResponse, logger, ApiError, validateFields } from '@/lib/apiUtils';
import { toDbOrderStatus, toUiOrderStatus } from '@/lib/orderStatus';
import { isUUID } from '@/lib/utils';
import { Order, Payment } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate caller & verify Admin / Super Admin role
    const caller = await requireAuth(req);
    const callerRole = (caller.role || '').toLowerCase();

    if (!['super admin', 'admin'].includes(callerRole)) {
      throw new ApiError('Forbidden: Only Admin or Super Admin accounts are authorized to record new orders.', 403);
    }

    // 2. Enforce Rate Limit (30 creations per minute per IP)
    await enforceRateLimit(req, 30, 60000);

    // 3. Input Validation
    const body = await req.json().catch(() => ({}));
    validateFields(body, {
      customerName: 'string',
      customerEmail: 'email',
      shippingAddress: 'object',
      items: 'array',
    });

    const {
      customerName,
      customerEmail,
      customerPhone,
      userId,
      items,
      shippingAddress,
      paymentMethod,
      notes,
      status = 'Pending'
    } = body;

    const trimmedCustomerName = String(customerName).trim().slice(0, 100);
    const trimmedEmail = String(customerEmail).trim().toLowerCase();
    const trimmedPhone = typeof customerPhone === 'string' ? customerPhone.trim().slice(0, 30) : '';

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError('At least one order line item is required.', 400);
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it || typeof it !== 'object') {
        throw new ApiError(`Invalid item at row index ${i + 1}.`, 400);
      }
      const price = Number(it.price);
      const qty = Number(it.quantity);
      if (!Number.isFinite(price) || price < 0) {
        throw new ApiError(`Item "${it.productName || i + 1}" must have a valid non-negative price.`, 400);
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        throw new ApiError(`Item "${it.productName || i + 1}" must have a quantity of at least 1.`, 400);
      }
    }

    const cleanAddress = {
      country: String(shippingAddress.country || 'Uganda').trim().slice(0, 80),
      district: String(shippingAddress.district || shippingAddress.city || 'Kampala').trim().slice(0, 80),
      city: String(shippingAddress.city || 'Kampala').trim().slice(0, 80),
      address: String(shippingAddress.address || 'Lubowa Showroom').trim().slice(0, 200),
    };

    if (!cleanAddress.address) {
      throw new ApiError('Delivery street address is required.', 400);
    }

    const calculatedAmount = items.reduce((sum: number, it: any) => sum + (Number(it.price) * Number(it.quantity)), 0);
    const orderUUID = crypto.randomUUID();
    const orderNumber = `BHD-${Math.floor(1000 + Math.random() * 9000)}`;
    const uiStatus = toUiOrderStatus(status);
    const dbStatus = toDbOrderStatus(uiStatus);
    const chosenPaymentMethod = paymentMethod || 'Cash on Delivery';
    const createdAt = new Date().toISOString();

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    logger.info('Admin recording new order entry', {
      adminId: caller.id,
      orderNumber,
      orderUUID,
      customerEmail: trimmedEmail,
      amount: calculatedAmount
    });

    // 4. Insert order row
    const { error: orderError } = await supabaseAdmin.from('orders').insert({
      id: orderUUID,
      user_id: (userId && isUUID(userId)) ? userId : null,
      order_number: orderNumber,
      amount: calculatedAmount,
      status: dbStatus,
      payment_method: chosenPaymentMethod,
      notes: notes ? String(notes).trim().slice(0, 500) : null,
      created_at: createdAt
    });

    if (orderError) {
      logger.error('Failed inserting order in admin create order:', orderError);
      throw new ApiError(`Failed to insert order: ${orderError.message}`, 500);
    }

    try {
      // 5. Insert order items
      const orderItemsRows = items.map((it: any) => ({
        id: crypto.randomUUID(),
        order_id: orderUUID,
        product_id: (it.productId && isUUID(it.productId)) ? it.productId : null,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        selected_size: it.selectedSize ? String(it.selectedSize).trim() : 'M',
        selected_color: it.selectedColor ? String(it.selectedColor).trim() : 'Default'
      }));

      const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItemsRows);
      if (itemsError) {
        throw new Error(`Failed to insert order items: ${itemsError.message}`);
      }

      // 6. Insert order address
      const { error: addrError } = await supabaseAdmin.from('order_addresses').insert({
        id: crypto.randomUUID(),
        order_id: orderUUID,
        country: cleanAddress.country,
        district: cleanAddress.district,
        city: cleanAddress.city,
        address: cleanAddress.address
      });
      if (addrError) {
        throw new Error(`Failed to insert shipping address: ${addrError.message}`);
      }

      // 7. Insert payment record
      const paymentUUID = crypto.randomUUID();
      const paymentStatus = uiStatus === 'Delivered' ? 'Paid' : 'Pending';
      const paymentDate = createdAt.split('T')[0];
      const { error: payError } = await supabaseAdmin.from('payments').insert({
        id: paymentUUID,
        order_id: orderUUID,
        amount: calculatedAmount,
        status: paymentStatus,
        payment_method: chosenPaymentMethod,
        transaction_id: `ADMIN-${Math.floor(1000 + Math.random() * 9000)}`,
        date: paymentDate
      });
      if (payError) {
        logger.warn('Failed creating linked payment entry in admin create order, continuing with warning:', payError);
      }

      const formattedOrder: Order = {
        id: orderUUID,
        orderNumber,
        userId: (userId && isUUID(userId)) ? userId : undefined,
        customerName: trimmedCustomerName,
        customerEmail: trimmedEmail,
        customerPhone: trimmedPhone,
        amount: calculatedAmount,
        status: uiStatus,
        date: createdAt,
        paymentMethod: chosenPaymentMethod,
        notes: notes ? String(notes).trim() : undefined,
        items: items.map((it: any) => ({
          productId: it.productId || 'custom-item',
          productName: it.productName || 'Bespoke Item',
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          selectedSize: it.selectedSize || 'M',
          selectedColor: it.selectedColor || 'Default',
          image: it.image || 'https://picsum.photos/seed/suit/600/600'
        })),
        shippingAddress: cleanAddress
      };

      const formattedPayment: Payment = {
        id: paymentUUID,
        orderId: orderUUID,
        customerName: trimmedCustomerName,
        customerEmail: trimmedEmail,
        amount: calculatedAmount,
        status: paymentStatus,
        paymentMethod: chosenPaymentMethod,
        transactionId: `ADMIN-${Math.floor(1000 + Math.random() * 9000)}`,
        date: paymentDate
      };

      return NextResponse.json({
        success: true,
        order: formattedOrder,
        payment: formattedPayment
      });

    } catch (nestedErr: any) {
      // Compensating rollback: remove the created order
      logger.error('Compensating rollback: deleting order after secondary insert failure', nestedErr);
      await supabaseAdmin.from('orders').delete().eq('id', orderUUID);
      throw new ApiError(nestedErr.message || 'Failed recording order items or address.', 500);
    }

  } catch (err) {
    return createErrorResponse(req, err);
  }
}
