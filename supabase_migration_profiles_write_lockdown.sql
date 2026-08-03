-- ==========================================
-- MIGRATION: LOCKDOWN PROFILES WRITE ACCESS TO ADMIN AND SUPER ADMIN
-- ==========================================

-- Drop the overly broad full access policy on profiles
DROP POLICY IF EXISTS "Allow full access to profiles for admin" ON public.profiles;

-- Create narrowed policy requiring admin-tier authority (Super Admin or Admin) for writes
CREATE POLICY "Allow admin-tier write access to profiles" ON public.profiles
  FOR ALL USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.role IN ('super admin', 'admin')
    )
  );
