-- Add BHD Courier Method settings columns to public.app_settings
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS courier_standard_fee NUMERIC NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS courier_express_fee NUMERIC NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS courier_pickup_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS courier_method_standard BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS courier_method_express BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS courier_method_pickup BOOLEAN NOT NULL DEFAULT true;
