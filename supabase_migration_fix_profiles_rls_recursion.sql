-- ============================================================================
-- MIGRATION: FIX PROFILES RLS INFINITE RECURSION (POSTGRES ERROR 42P17)
-- ============================================================================
-- Description:
-- Replaces direct self-referential queries on public.profiles within the
-- WITH CHECK policy clauses with SECURITY DEFINER helper functions.
-- This ensures elevated evaluation for profile metadata validation without
-- triggering recursive RLS evaluation during profile reads/writes.
-- ============================================================================

BEGIN;

-- 1. Helper checking if user holds administrative/staff authority (Staff, Manager, Admin, Super Admin)
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND role IN ('super admin', 'admin', 'manager', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Helper checking if user holds admin-tier authority (Admin, Super Admin)
CREATE OR REPLACE FUNCTION public.is_admin_tier(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND role IN ('super admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Helper returning immutable/locked profile fields for the authenticated caller
CREATE OR REPLACE FUNCTION public.get_own_profile_locked_fields()
RETURNS TABLE(role TEXT, is_active BOOLEAN, reward_points INTEGER, lifetime_spending NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT p.role, p.is_active, p.reward_points, p.lifetime_spending
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Recreate "Allow users to update their own profile" policy using get_own_profile_locked_fields()
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

-- 5. Recreate "Allow admin-tier write access to profiles" policy using is_admin_tier()
DROP POLICY IF EXISTS "Allow full access to profiles for admin" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin-tier write access to profiles" ON public.profiles;
CREATE POLICY "Allow admin-tier write access to profiles" ON public.profiles
    FOR ALL USING (public.is_admin_or_staff(auth.uid()))
    WITH CHECK (public.is_admin_tier(auth.uid()));

COMMIT;
