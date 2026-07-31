-- Migration: Add client contact fields to consultations table
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS client_phone TEXT;
