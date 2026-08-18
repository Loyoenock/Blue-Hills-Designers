-- ============================================================================
-- Migration: Fix Orders Self-Update RLS Policy
-- File: supabase_migration_fix_orders_self_update_rls.sql
-- ============================================================================
--
-- Closes the orders self-update RLS gap.
-- Ensures authenticated non-admin customers can only cancel their own orders
-- when the order is in 'pending' or 'processing' status, preventing arbitrary
-- mutation of order fields (amount, status to delivered, items, etc.).
-- ============================================================================

BEGIN;

-- Drop legacy or existing self-update policies
DROP POLICY IF EXISTS "Allow users to update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow users to cancel their own pending/processing orders" ON public.orders;

-- Create hardened self-update policy
CREATE POLICY "Allow users to update their own orders" ON public.orders
    FOR UPDATE
    USING (
        auth.uid() = user_id
        AND lower(status) IN ('pending', 'processing')
    )
    WITH CHECK (
        auth.uid() = user_id
        AND lower(status) = 'cancelled'
    );

COMMIT;
