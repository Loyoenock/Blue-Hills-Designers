-- Migration: Add unique index on newsletter_subscribers lower(email)
-- Run this SQL in the Supabase SQL Editor to prevent duplicate newsletter subscriptions.

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_unique
  ON public.newsletter_subscribers (lower(email));
