-- Migration: Add updated_at column to orders and payments tables
-- Run this SQL in the Supabase SQL Editor to ensure updated_at is available for status tracking.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
