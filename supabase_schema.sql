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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.1 CATEGORIES
CREATE POLICY "Allow public read-access to categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Allow administrative changes to categories" ON public.categories FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- 3.2 PROFILES
DROP POLICY IF EXISTS "Allow public read-access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view own profile or admin view all" ON public.profiles;
CREATE POLICY "Allow users to view own profile or admin view all" ON public.profiles FOR SELECT USING (
    auth.uid() = id OR public.is_admin_or_staff(auth.uid())
);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow full access to profiles for admin" ON public.profiles FOR ALL USING (public.is_admin_or_staff(auth.uid()));

-- PUBLIC PROFILE NAMES VIEW (for public display of review authors without exposing email/phone/spending)
CREATE OR REPLACE VIEW public.public_profile_names WITH (security_invoker = false) AS
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
CREATE POLICY "Allow users to update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);
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
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']
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

CREATE OR REPLACE VIEW public.public_profile_names WITH (security_invoker = false) AS
SELECT id, full_name, role
FROM public.profiles;

GRANT SELECT ON public.public_profile_names TO anon, authenticated, service_role;
