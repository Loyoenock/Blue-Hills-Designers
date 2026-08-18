-- ============================================================================
-- Migration: Enable Realtime Publication for Orders & Payments
-- File: supabase_migration_enable_realtime_orders_payments.sql
-- ============================================================================
--
-- How to verify whether a table is in the Supabase Realtime publication:
-- Run the following query in the Supabase SQL Editor:
--
--   SELECT pubname, schemaname, tablename 
--   FROM pg_publication_tables 
--   WHERE pubname = 'supabase_realtime';
--
-- If 'orders' and 'payments' appear in the result rows, realtime broadcasting
-- is active for postgres_changes listeners.
-- ============================================================================

DO $$
BEGIN
  -- Add public.orders if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  -- Add public.payments if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END $$;
