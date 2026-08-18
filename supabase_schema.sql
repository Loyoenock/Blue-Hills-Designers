-- ==========================================
-- GENTLEMEN'S SEWING & LUXURY ATTIRE
-- SUPABASE SCHEMA DEFINITIONS & RLS POLICIES
-- ==========================================

-- Enable the UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 0. CLEAN SLATE (CLEANUP IN REVERSE ORDER)
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS public.consultations CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.order_addresses CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.product_images CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- ==========================================
-- 1. DATABASE TABLES DESIGN
-- ==========================================

-- 1.1 CATEGORIES
-- Store distinct product collections (Suits, Shirts, Shoes, Accessories)
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.2 USER PROFILES
-- Linked with Supabase Auth users via a secure cascade reference.
-- Stores client loyalty metrics, contact details, and platform roles.
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('super admin', 'admin', 'manager', 'staff', 'customer')),
    reward_points INTEGER DEFAULT 0 NOT NULL,
    lifetime_spending NUMERIC DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    must_change_password BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.3 MASTER PRODUCT INVENTORY
-- Master inventory containing specifications of luxury suits, shoes, and shirts.
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    discount_percentage NUMERIC DEFAULT 0 NOT NULL,
    is_featured BOOLEAN DEFAULT false NOT NULL,
    is_new BOOLEAN DEFAULT false NOT NULL,
    is_deal BOOLEAN DEFAULT false NOT NULL,
    deal_days INTEGER NULL,
    deal_hours INTEGER NULL,
    deal_mins INTEGER NULL,
    deal_secs INTEGER NULL,
    deal_expires_at TIMESTAMP WITH TIME ZONE NULL,
    sizes TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    colors TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    rating NUMERIC DEFAULT 0 NOT NULL,
    stock INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'Active' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.4 PRODUCT REVIEWS
-- Hand-tailored product reviews and feedback submitted by customers.
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.5 PRODUCT IMAGE GALLERY
-- Multiple imagery assets associated with product cards or detail views.
CREATE TABLE public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.6 CUSTOMER ORDERS
-- Log of purchases and transaction billing totals.
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
    payment_method TEXT DEFAULT 'Cash on Delivery' NOT NULL,
    notes TEXT,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- 1.7 ORDER ITEMS
-- Relational mapping connecting items in the orders to specific quantities and prices.
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID, -- Placeholder for size/color combinations
    selected_size TEXT,
    selected_color TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.8 ORDER SHIPPING ADDRESSES
-- Delivery destinations captured on checkout.
CREATE TABLE public.order_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    country TEXT NOT NULL DEFAULT 'Uganda',
    district TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.9 TRANSACTION PAYMENTS
-- Logging table verifying settlement provider details and gateway references.
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider TEXT DEFAULT 'Cash on Delivery' NOT NULL,
    transaction_id TEXT,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'success' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.10 CONSULTATION BOOKINGS
-- Private sartorial advisory, fitting appointments, or stylist schedules.
CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Null allowed for anonymous bookings
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.11 NEWSLETTER SUBSCRIBERS
-- Emails opt-in log for promotional material.
CREATE TABLE public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.12 SECURITY AUDIT TELEMETRY
-- Action tracking for sensitive management procedures.
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1.13 WISHLISTS
-- Saved items bookmark registry.
CREATE TABLE public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, product_id)
);


-- ==========================================
-- 2. ROW LEVEL SECURITY (RLS) ACTIVATION
-- ==========================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- 3. POLICIES CREATION
-- ==========================================

-- Helper checking if user holds administrative/staff authority
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND role IN ('super admin', 'admin', 'manager', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper checking if user holds admin-tier authority (Super Admin or Admin)
CREATE OR REPLACE FUNCTION public.is_admin_tier(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND role IN ('super admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper returning locked fields for the calling authenticated user to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.get_own_profile_locked_fields()
RETURNS TABLE(role TEXT, is_active BOOLEAN, reward_points INTEGER, lifetime_spending NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT p.role, p.is_active, p.reward_points, p.lifetime_spending
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3.1 CATEGORIES
CREATE POLICY "Allow public read-access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow administrative changes to categories" ON public.categories FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.2 PROFILES
-- Prevent privilege escalation: Users can only update their own profile (auth.uid() = id)
-- and cannot modify their role, account status (is_active), or loyalty metrics (reward_points,
-- lifetime_spending) unless they hold administrative/staff privileges. Self-service updates
-- are strictly restricted to personal contact details (full_name, phone, email).
-- Uses SECURITY DEFINER helpers to eliminate RLS self-referential recursion.
DROP POLICY IF EXISTS "Allow public read-access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view own profile or admin view all" ON public.profiles;
CREATE POLICY "Allow users to view own profile or admin view all" ON public.profiles FOR SELECT USING (
    auth.uid() = id OR public.is_admin_or_staff(auth.uid())
);
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
CREATE POLICY "Allow users to update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (
            (
                role, is_active, reward_points, lifetime_spending
            ) = (
                SELECT role, is_active, reward_points, lifetime_spending
                FROM public.get_own_profile_locked_fields()
            )
            OR public.is_admin_or_staff(auth.uid())
        )
    );
DROP POLICY IF EXISTS "Allow full access to profiles for admin" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin-tier write access to profiles" ON public.profiles;
CREATE POLICY "Allow admin-tier write access to profiles" ON public.profiles
    FOR ALL USING (public.is_admin_or_staff(auth.uid()))
    WITH CHECK (public.is_admin_tier(auth.uid()));

-- PUBLIC PROFILE NAMES VIEW (for public display of review authors without exposing email/phone/spending)
CREATE OR REPLACE VIEW public.public_profile_names WITH (security_invoker = true) AS
SELECT id, full_name, role
FROM public.profiles;

GRANT SELECT ON public.public_profile_names TO anon, authenticated, service_role;

-- 3.3 PRODUCTS
CREATE POLICY "Allow public read-access to products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow administrative full access to products" ON public.products FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.4 REVIEWS
CREATE POLICY "Allow public read-access to reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Allow authenticated user insertion to reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to update/delete their reviews" ON public.reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow administrators full access to reviews" ON public.reviews FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.5 PRODUCT IMAGES
CREATE POLICY "Allow public read-access to product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Allow administrative full access to images" ON public.product_images FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.6 ORDERS
CREATE POLICY "Allow users to view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to create their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
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
CREATE POLICY "Allow administrative access to orders" ON public.orders FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.7 ORDER ITEMS
CREATE POLICY "Allow users to view their own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Allow users to insert order items" ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Allow administrative access to order items" ON public.order_items FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.8 ORDER ADDRESSES
CREATE POLICY "Allow users to view their shipping addresses" ON public.order_addresses FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Allow users to insert shipping addresses" ON public.order_addresses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Allow administrative access to shipping addresses" ON public.order_addresses FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.9 PAYMENTS
CREATE POLICY "Allow users to view their own payments" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Allow users to insert payments" ON public.payments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Allow administrative access to payments" ON public.payments FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.10 CONSULTATIONS
CREATE POLICY "Allow users to view their own bookings" ON public.consultations FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Allow users to insert bookings" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Allow administrative access to consultations" ON public.consultations FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.11 NEWSLETTER SUBSCRIBERS
CREATE POLICY "Allow anyone to subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow administrative access to subscribers" ON public.newsletter_subscribers FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.12 AUDIT LOGS
CREATE POLICY "Allow users to view their own audit records" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert audit records" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow administrative access to audit logs" ON public.audit_logs FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.13 WISHLISTS
CREATE POLICY "Allow users to view their own wishlist" ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to insert into wishlist" ON public.wishlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow users to delete from wishlist" ON public.wishlists FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow administrative access to wishlists" ON public.wishlists FOR ALL USING (public.is_admin_or_staff(auth.uid()));


-- ==========================================
-- 4. NEW AUTH USER PROFILE SYNC TRIGGER
-- ==========================================

-- Function to handle profile instantiation on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    phone, 
    role, 
    reward_points, 
    lifetime_spending, 
    is_active
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      'Gentleman Customer'
    ),
    new.raw_user_meta_data->>'phone',
    LOWER(COALESCE(new.raw_user_meta_data->>'role', 'customer')),
    0,
    0,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initiate profiles sync
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 5. STORAGE BUCKET & RLS POLICIES FOR "app-file"
-- ==========================================

-- Ensure storage schema and tables exist (standard on Supabase)
-- 5.1 Enable the bucket creation and metadata
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'app-file', 
    'app-file', 
    true, 
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5.2 Storage policies for storage.objects
-- Note: Row Level Security (RLS) is enabled on storage.objects by default in Supabase.

-- 5.3 Clear existing policies for 'app-file' if any, to avoid conflicts
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin or Staff Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin or Staff Delete Access" ON storage.objects;

-- 5.4 Public Read/Select Policy
-- Allows anyone to view images and files within the 'app-file' bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'app-file');

-- 5.5 Upload/Insert Policy
-- Allows authenticated users to upload files into 'app-file' bucket
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-file' AND auth.role() = 'authenticated');

-- 5.6 Update/Upsert Policy
-- Allows admin or staff users to update files within 'app-file' bucket
CREATE POLICY "Admin or Staff Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'app-file' AND public.is_admin_or_staff(auth.uid()));

-- 5.7 Delete Policy
-- Allows admin or staff users to remove/delete files from 'app-file' bucket
CREATE POLICY "Admin or Staff Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'app-file' AND public.is_admin_or_staff(auth.uid()));

-- ==========================================
-- 6. COUPONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
    discount_value NUMERIC NOT NULL,
    min_subtotal NUMERIC NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    usage_limit INTEGER NULL,
    times_used INTEGER NOT NULL DEFAULT 0,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-access to active coupons" ON public.coupons;
CREATE POLICY "Allow public read-access to active coupons"
    ON public.coupons FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Allow administrative full access to coupons" ON public.coupons;
CREATE POLICY "Allow administrative full access to coupons"
    ON public.coupons FOR ALL
    USING (public.is_admin_or_staff(auth.uid()));

-- Seed default luxury coupons
INSERT INTO public.coupons (code, discount_type, discount_value, is_active)
VALUES
    ('WELCOME10', 'percentage', 10, true),
    ('GENTLEMAN20', 'percentage', 20, true),
    ('SAVILEROW50', 'fixed', 50, true),
    ('KAMPALA30', 'percentage', 30, true)
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- 7. TESTIMONIALS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NULL,
    company TEXT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-access to active testimonials" ON public.testimonials;
CREATE POLICY "Allow public read-access to active testimonials"
    ON public.testimonials FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Allow administrative full access to testimonials" ON public.testimonials;
CREATE POLICY "Allow administrative full access to testimonials"
    ON public.testimonials FOR ALL
    USING (public.is_admin_or_staff(auth.uid()));

-- Seed default testimonials
INSERT INTO public.testimonials (quote, name, role, company, display_order, is_active)
VALUES
    ('Blue Hills Designers has completely reshaped corporate fashion in East Africa. The fit of their Savile suit is unmatched. Perfect boardroom armory.', 'Dr. David Ssewankambo', 'Managing Director', 'Standard Capital Uganda', 1, true),
    ('The Egyptian Poplin White shirt stays exceptionally crisp during long diplomatic flights and state banquets. Their concierge delivery is top tier.', 'Hon. Andrew Mukasa', 'Senior Diplomat', 'Ministry of Foreign Affairs', 2, true),
    ('I visited their Lubowa showroom for a ready-made corporate suit. The level of personal attention, refreshment service, and premium clothing quality was truly top tier.', 'Charles Mugisha', 'Investment VP', 'Ascent Capital Africa', 3, true);

-- Additive migration for Secret Offer deal countdown columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deal_days INTEGER NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deal_hours INTEGER NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deal_mins INTEGER NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deal_secs INTEGER NULL;

-- App Settings Singleton Table Migration
CREATE TABLE IF NOT EXISTS public.app_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    showroom_hours TEXT,
    support_phone TEXT,
    concierge_phone TEXT,
    free_shipping_threshold NUMERIC,
    tax_rate NUMERIC,
    ai_greeting_prefix TEXT,
    enable_news_banner BOOLEAN NOT NULL DEFAULT true,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    currency_symbol TEXT,
    enable_secret_offer BOOLEAN NOT NULL DEFAULT true,
    payment_method_mobile_money BOOLEAN NOT NULL DEFAULT true,
    payment_method_visa BOOLEAN NOT NULL DEFAULT true,
    payment_method_cash_on_delivery BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-access to app settings" ON public.app_settings;
CREATE POLICY "Allow public read-access to app settings"
    ON public.app_settings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow administrative update to app settings" ON public.app_settings;
CREATE POLICY "Allow administrative update to app settings"
    ON public.app_settings FOR UPDATE
    USING (public.is_admin_or_staff(auth.uid()));

-- Seed initial default singleton row
INSERT INTO public.app_settings (
    id,
    showroom_hours,
    support_phone,
    concierge_phone,
    free_shipping_threshold,
    tax_rate,
    ai_greeting_prefix,
    enable_news_banner,
    maintenance_mode,
    currency_symbol,
    enable_secret_offer,
    payment_method_mobile_money,
    payment_method_visa,
    payment_method_cash_on_delivery
) VALUES (
    1,
    'Sunday to Friday: 9:00 AM to 7:00 PM (Saturdays Closed)',
    '+256 772 123456',
    '+256 772 123456',
    2000,
    18,
    'Good day, Executive.',
    true,
    false,
    'Ugx',
    true,
    true,
    true,
    true
) ON CONFLICT (id) DO NOTHING;

-- Cleanup legacy fake settings category row
DELETE FROM public.categories WHERE slug = 'app-settings';

-- Profiles RLS Scoping & Public Profile Names View Migration
DROP POLICY IF EXISTS "Allow public read-access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view own profile or admin view all" ON public.profiles;
CREATE POLICY "Allow users to view own profile or admin view all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin_or_staff(auth.uid()));

CREATE OR REPLACE VIEW public.public_profile_names WITH (security_invoker = true) AS
SELECT id, full_name, role
FROM public.profiles;

GRANT SELECT ON public.public_profile_names TO anon, authenticated, service_role;

-- Storage bucket allowed_mime_types update (remove image/svg+xml)
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
WHERE id = 'app-file';

-- Helper Function: Reserve product stock atomically
CREATE OR REPLACE FUNCTION public.reserve_product_stock(
    p_product_id UUID,
    p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rows_affected INT;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN TRUE;
    END IF;

    UPDATE public.products
    SET stock = stock - p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id
      AND stock >= p_quantity;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_product_stock TO anon, authenticated, service_role;

-- Helper Function: Release product stock atomically
CREATE OR REPLACE FUNCTION public.release_product_stock(
    p_product_id UUID,
    p_quantity INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RETURN;
    END IF;

    UPDATE public.products
    SET stock = stock + p_quantity,
        updated_at = NOW()
    WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_product_stock TO anon, authenticated, service_role;

-- Atomic Transaction Function for Checkout Order Creation
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

-- Additive migration for Deal of the Day real expiration timestamp
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deal_expires_at TIMESTAMP WITH TIME ZONE NULL;

-- Additive migration for payment reconciliation flags
CREATE TABLE IF NOT EXISTS public.reconciliation_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT,
    email TEXT,
    amount NUMERIC,
    payment_provider TEXT,
    raw_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.reconciliation_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow staff and admin to view reconciliation_flags" ON public.reconciliation_flags;
CREATE POLICY "Allow staff and admin to view reconciliation_flags" ON public.reconciliation_flags
    FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

GRANT SELECT ON public.reconciliation_flags TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.reconciliation_flags TO service_role;

-- Additive migration for saved addresses
CREATE TABLE IF NOT EXISTS public.saved_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT,
    country TEXT NOT NULL DEFAULT 'Uganda',
    district TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to view their own saved addresses" ON public.saved_addresses;
CREATE POLICY "Allow users to view their own saved addresses" ON public.saved_addresses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their saved addresses" ON public.saved_addresses;
CREATE POLICY "Allow users to insert their saved addresses" ON public.saved_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update their saved addresses" ON public.saved_addresses;
CREATE POLICY "Allow users to update their saved addresses" ON public.saved_addresses FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their saved addresses" ON public.saved_addresses;
CREATE POLICY "Allow users to delete their saved addresses" ON public.saved_addresses FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow administrative access to saved_addresses" ON public.saved_addresses;
CREATE POLICY "Allow administrative access to saved_addresses" ON public.saved_addresses FOR ALL USING (public.is_admin_or_staff(auth.uid()));

GRANT ALL ON public.saved_addresses TO authenticated, service_role;

-- Additive migration for AI Stylist Conversations
CREATE TABLE IF NOT EXISTS public.stylist_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.stylist_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to view their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to view their own stylist conversations" ON public.stylist_conversations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to insert their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to insert their own stylist conversations" ON public.stylist_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to update their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to update their own stylist conversations" ON public.stylist_conversations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users to delete their own stylist conversations" ON public.stylist_conversations;
CREATE POLICY "Allow users to delete their own stylist conversations" ON public.stylist_conversations FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow staff and admin to view stylist_conversations" ON public.stylist_conversations;
CREATE POLICY "Allow staff and admin to view stylist_conversations" ON public.stylist_conversations FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

GRANT ALL ON public.stylist_conversations TO authenticated, service_role;

-- ==========================================
-- MIGRATION: ADD DYNAMIC SIZES & COLORS COLUMNS
-- ==========================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}'::TEXT[] NOT NULL;

DO $$
DECLARE
    r RECORD;
    parsed_json JSONB;
    extracted_sizes TEXT[];
    extracted_colors TEXT[];
    orig_short TEXT;
BEGIN
    FOR r IN SELECT id, short_description, description FROM public.products LOOP
        IF r.short_description IS NOT NULL AND r.short_description LIKE '{%}' THEN
            BEGIN
                parsed_json := r.short_description::jsonb;

                -- Extract sizes array if present
                IF parsed_json ? 'sizes' AND jsonb_typeof(parsed_json->'sizes') = 'array' THEN
                    extracted_sizes := ARRAY(SELECT jsonb_array_elements_text(parsed_json->'sizes'));
                ELSE
                    extracted_sizes := '{}'::TEXT[];
                END IF;

                -- Extract colors array if present
                IF parsed_json ? 'colors' AND jsonb_typeof(parsed_json->'colors') = 'array' THEN
                    extracted_colors := ARRAY(SELECT jsonb_array_elements_text(parsed_json->'colors'));
                ELSE
                    extracted_colors := '{}'::TEXT[];
                END IF;

                -- Extract original_short if present
                IF parsed_json ? 'original_short' AND jsonb_typeof(parsed_json->'original_short') = 'string' AND length(parsed_json->>'original_short') > 0 THEN
                    orig_short := parsed_json->>'original_short';
                ELSE
                    orig_short := substring(COALESCE(r.description, ''), 1, 150);
                END IF;

                -- Update the product row
                UPDATE public.products
                SET sizes = extracted_sizes,
                    colors = extracted_colors,
                    short_description = orig_short
                WHERE id = r.id;

            EXCEPTION WHEN OTHERS THEN
                -- If JSON parsing fails, leave short_description untouched and sizes/colors as default empty array
                NULL;
            END;
        END IF;
    END LOOP;
END $$;



