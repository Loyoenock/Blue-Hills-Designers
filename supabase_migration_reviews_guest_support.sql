-- Migration: Support guest (unauthenticated) reviews
-- Run this SQL in the Supabase SQL Editor to allow guest reviews and store reviewer details.

ALTER TABLE public.reviews
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS user_company TEXT;
