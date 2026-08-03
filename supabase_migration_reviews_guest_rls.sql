-- Migration: Support guest (unauthenticated) review RLS policy
-- Run this SQL in the Supabase SQL Editor once to allow guest or owner review inserts without FK/RLS failure.
-- Document: run once in Supabase SQL Editor. No DROP TABLE.

DROP POLICY IF EXISTS "Allow authenticated user insertion to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow guest or owner review insert" ON public.reviews;

CREATE POLICY "Allow guest or owner review insert" ON public.reviews
    FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
