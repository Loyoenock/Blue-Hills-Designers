import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth, enforceRateLimit, createErrorResponse, logger, ApiError } from '@/lib/apiUtils';
import { toDbOrderStatus, toUiOrderStatus } from '@/lib/orderStatus';
import { isUUID } from '@/lib/utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id: orderId } = await context.params;

    // 1. Authenticate caller & verify Admin / Super Admin / Manager role
    const caller = await requireAuth(req);
    const callerRole = (caller.role || '').toLowerCase();

    if (!['super admin', 'admin', 'manager'].includes(callerRole)) {
      throw new ApiError('Forbidden: Your authority role level does not permit modifying order ledger records.', 403);
    }

    // 2. Enforce Rate Limit (30 updates per minute per IP)
    await enforceRateLimit(req, 30, 60000);

    // 3. Validate target order UUID
    if (!orderId || !isUUID(orderId)) {
      throw new ApiError('This record only exists locally and has no corresponding database entry to update.', 400);
    }

    const body = await req.json().catch(() => ({}));
    const {
      customerName,
      customerEmail,
      customerPhone,
      notes,
      status,
      paymentMethod,
      shippingAddress,
      items
    } = body;

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    logger.info('Admin updating order record', {
      adminId: caller.id,
      orderId,
      status,
      hasItemsUpdate: Array.isArray(items)
    });

    const orderUpdates: Record<string, any> = {};

    if (notes !== undefined) {
      orderUpdates.notes = notes ? String(notes).trim().slice(0, 500) : null;
    }
    if (paymentMethod !== undefined) {
      orderUpdates.payment_method = String(paymentMethod).trim();
    }
    if (status !== undefined) {
      orderUpdates.status = toDbOrderStatus(status);
    }

    let calculatedAmount: number | null = null;
    if (Array.isArray(items) && items.length > 0) {
      calculatedAmount = items.reduce((sum: number, it: any) => sum + (Number(it.price) * Number(it.quantity)), 0);
      orderUpdates.amount = calculatedAmount;
    }

    // 4. Update orders table if fields changed
    if (Object.keys(orderUpdates).length > 0) {
      const { error: orderErr } = await supabaseAdmin
        .from('orders')
        .update(orderUpdates)
        .eq('id', orderId);

      if (orderErr) {
        logger.error('Failed updating orders table in adminUpdateOrder:', orderErr);
        throw new ApiError(`Failed to update order: ${orderErr.message}`, 500);
      }
    }

    // 5. Update items if provided (delete + reinsert)
    if (Array.isArray(items) && items.length > 0) {
      await supabaseAdmin.from('order_items').delete().eq('order_id', orderId);

      const orderItemsRows = items.map((it: any) => ({
        id: crypto.randomUUID(),
        order_id: orderId,
        product_id: (it.productId && isUUID(it.productId)) ? it.productId : null,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        selected_size: it.selectedSize ? String(it.selectedSize).trim() : 'M',
        selected_color: it.selectedColor ? String(it.selectedColor).trim() : 'Default'
      }));

      const { error: insertItemsErr } = await supabaseAdmin.from('order_items').insert(orderItemsRows);
      if (insertItemsErr) {
        logger.error('Failed re-inserting order items in adminUpdateOrder:', insertItemsErr);
        throw new ApiError(`Failed to update line items: ${insertItemsErr.message}`, 500);
      }
    }

    // 6. Update shipping address if provided
    if (shippingAddress && typeof shippingAddress === 'object') {
      const addrRow = {
        order_id: orderId,
        country: String(shippingAddress.country || 'Uganda').trim().slice(0, 80),
        district: String(shippingAddress.district || shippingAddress.city || 'Kampala').trim().slice(0, 80),
        city: String(shippingAddress.city || 'Kampala').trim().slice(0, 80),
        address: String(shippingAddress.address || 'Lubowa Showroom').trim().slice(0, 200),
      };

      const { data: existingAddr } = await supabaseAdmin
        .from('order_addresses')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (existingAddr) {
        await supabaseAdmin.from('order_addresses').update(addrRow).eq('id', existingAddr.id);
      } else {
        await supabaseAdmin.from('order_addresses').insert({
          id: crypto.randomUUID(),
          ...addrRow
        });
      }
    }

    // 7. Update payments status side-effects if status changed
    if (status !== undefined) {
      const uiStatus = toUiOrderStatus(status);
      if (uiStatus === 'Delivered') {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'Paid' })
          .eq('order_id', orderId)
          .eq('status', 'Pending');
      } else if (uiStatus === 'Cancelled') {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'Cancelled' })
          .eq('order_id', orderId)
          .neq('status', 'Refunded');
      }
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    return createErrorResponse(req, err);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const { id: orderId } = await context.params;

    // 1. Authenticate caller & verify Admin / Super Admin role (Restricted to Admin+)
    const caller = await requireAuth(req);
    const callerRole = (caller.role || '').toLowerCase();

    if (!['super admin', 'admin'].includes(callerRole)) {
      throw new ApiError('Forbidden: Only Admin or Super Admin accounts are authorized to delete orders from the ledger.', 403);
    }

    // 2. Enforce Rate Limit (30 deletions per minute per IP)
    await enforceRateLimit(req, 30, 60000);

    // 3. Validate target order UUID
    if (!orderId || !isUUID(orderId)) {
      throw new ApiError('This record only exists locally and has no corresponding database entry to delete.', 400);
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    logger.info('Admin deleting order ledger entry', {
      adminId: caller.id,
      orderId
    });

    // 4. Delete order (CASCADE removes items, address, and payments)
    const { error: deleteError } = await supabaseAdmin
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteError) {
      logger.error('Failed deleting order from Supabase:', deleteError);
      throw new ApiError(`Failed to delete order: ${deleteError.message}`, 500);
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    return createErrorResponse(req, err);
  }
}
