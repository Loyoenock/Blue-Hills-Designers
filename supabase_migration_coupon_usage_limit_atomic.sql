-- Migration: Add atomic coupon usage limit enforcement in create_checkout_order RPC
-- Description: Moves coupon usage limit check into the atomic create_checkout_order PL/pgSQL transaction to prevent race conditions during concurrent checkouts.

CREATE OR REPLACE FUNCTION public.create_checkout_order(
    p_order_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_order_number TEXT DEFAULT NULL,
    p_amount NUMERIC DEFAULT 0,
    p_payment_method TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::JSONB,
    p_shipping JSONB DEFAULT '{}'::JSONB,
    p_payment_provider TEXT DEFAULT NULL,
    p_transaction_id TEXT DEFAULT NULL,
    p_payment_status TEXT DEFAULT 'pending',
    p_points_earned INT DEFAULT 0,
    p_coupon_id UUID DEFAULT NULL,
    p_ip_address TEXT DEFAULT '127.0.0.1'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    stock_item RECORD;
    v_current_spending NUMERIC;
    v_current_points INT;
BEGIN
    -- 0. Reserve stock atomically for all items in p_items (aggregated by product_id)
    -- If any product has insufficient stock, reserve_product_stock returns FALSE and we RAISE EXCEPTION,
    -- which automatically aborts and rolls back the entire PL/pgSQL transaction.
    FOR stock_item IN
        SELECT (x.product_id)::UUID AS product_id, SUM(x.quantity)::INT AS total_quantity
        FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, price NUMERIC)
        GROUP BY x.product_id
    LOOP
        IF NOT public.reserve_product_stock(stock_item.product_id, stock_item.total_quantity) THEN
            RAISE EXCEPTION 'Insufficient stock for product ID %', stock_item.product_id;
        END IF;
    END LOOP;

    -- 1. Insert shipping order details
    INSERT INTO public.orders (
        id,
        user_id,
        order_number,
        amount,
        status,
        payment_method,
        idempotency_key,
        notes
    ) VALUES (
        p_order_id,
        p_user_id,
        p_order_number,
        p_amount,
        'pending',
        p_payment_method,
        p_idempotency_key,
        p_notes
    );

    -- 2. Insert individual ordered items
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INT, price NUMERIC, selected_size TEXT, selected_color TEXT)
    LOOP
        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            price,
            selected_size,
            selected_color
        ) VALUES (
            p_order_id,
            item.product_id,
            item.quantity,
            item.price,
            item.selected_size,
            item.selected_color
        );
    END LOOP;

    -- 3. Insert physical shipping details
    INSERT INTO public.order_addresses (
        order_id,
        country,
        district,
        city,
        address
    ) VALUES (
        p_order_id,
        COALESCE(p_shipping->>'country', 'Uganda'),
        COALESCE(p_shipping->>'district', p_shipping->>'city'),
        p_shipping->>'city',
        p_shipping->>'address'
    );

    -- 4. Insert payment transaction record
    INSERT INTO public.payments (
        order_id,
        provider,
        transaction_id,
        amount,
        status
    ) VALUES (
        p_order_id,
        COALESCE(p_payment_provider, p_payment_method),
        p_transaction_id,
        p_amount,
        CASE WHEN p_payment_status = 'Paid' THEN 'success' ELSE 'pending' END
    );

    -- 5. If user is authenticated, update profile loyalty metrics
    IF p_user_id IS NOT NULL THEN
        SELECT lifetime_spending, reward_points
        INTO v_current_spending, v_current_points
        FROM public.profiles
        WHERE id = p_user_id;

        IF FOUND THEN
            UPDATE public.profiles
            SET lifetime_spending = COALESCE(v_current_spending, 0) + p_amount,
                reward_points = COALESCE(v_current_points, 0) + p_points_earned,
                updated_at = NOW()
            WHERE id = p_user_id;
        END IF;
    END IF;

    -- 6. Increment times_used if a coupon was used — now with an atomic limit check
    IF p_coupon_id IS NOT NULL THEN
        UPDATE public.coupons
        SET times_used = COALESCE(times_used, 0) + 1,
            updated_at = NOW()
        WHERE id = p_coupon_id
          AND (usage_limit IS NULL OR COALESCE(times_used, 0) < usage_limit);

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Coupon usage limit reached';
        END IF;
    END IF;

    -- 7. Log checkout security audit telemetry
    INSERT INTO public.audit_logs (
        user_id,
        action,
        details,
        ip_address
    ) VALUES (
        p_user_id,
        'Checkout Success',
        'Checkout successfully processed for Order ' || COALESCE(p_order_number, '') || ' totaling Ugx ' || COALESCE(p_amount::text, '0') || '. Payment: ' || COALESCE(p_payment_method, '') || ', TxnID: ' || COALESCE(p_transaction_id, '') || ', Status: ' || COALESCE(p_payment_status, '') || '.',
        COALESCE(p_ip_address, '127.0.0.1')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_checkout_order TO anon, authenticated, service_role;
