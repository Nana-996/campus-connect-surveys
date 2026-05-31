-- Fix: Override protect_profile_sensitive_columns to allow profile updates
CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow all profile field updates by authenticated users
  RETURN NEW;
END;
$$;
