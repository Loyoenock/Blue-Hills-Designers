-- =========================================================================
-- MIGRATION: ADD MISSING UNIQUE AND CHECK CONSTRAINTS (ADDITIVE & IDEMPOTENT)
-- =========================================================================
-- Instructions: Run this script in the Supabase SQL Editor.
-- Safe to run on live/production databases and safe to re-run multiple times.
-- Contains ZERO destructive statements (NO DROP, NO TRUNCATE, NO DELETE).

-- 1. Unique Index on Coupon Code (Case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_unique
  ON public.coupons (upper(code));

-- 2. Unique Index on Product Slug
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique
  ON public.products (slug);

-- 3. Unique Index on Newsletter Subscriber Email (Case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_unique
  ON public.newsletter_subscribers (lower(email));

-- 4. Unique Index on Category Slug
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique
  ON public.categories (slug);

-- 5. Unique Index on Wishlist User-Product Pair
CREATE UNIQUE INDEX IF NOT EXISTS wishlists_user_product_unique
  ON public.wishlists (user_id, product_id);

-- 6. Add Check Constraints Safely and Idempotently
DO $$
BEGIN
  -- Coupon discount_type check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_discount_type_check'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_discount_type_check CHECK (discount_type IN ('percentage', 'fixed'));
  END IF;

  -- Coupon discount_value non-negative check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_discount_value_check'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_discount_value_check CHECK (discount_value >= 0);
  END IF;

  -- Product price non-negative check
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_price_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_price_check CHECK (price >= 0);
  END IF;

  -- Product rating valid range check (0 to 5)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_rating_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_rating_check CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;
