-- Migration: Add must_change_password flag to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false NOT NULL;
