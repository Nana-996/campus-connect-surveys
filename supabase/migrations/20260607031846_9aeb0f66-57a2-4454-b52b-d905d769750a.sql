-- Create a public-safe function for survey share cards
-- This replaces direct supabaseAdmin queries in the public server function
CREATE OR REPLACE FUNCTION public.get_survey_share_card(_survey_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'id', s.id,
    'creator_id', s.creator_id,
    'title', s.title,
    'description', s.description,
    'response_count', s.response_count,
    'response_goal', s.response_goal,
    'expires_at', s.expires_at,
    'target_department', s.target_department,
    'target_year', s.target_year,
    'is_active', s.is_active,
    'owner_name', COALESCE(p.full_name, p.university_name)
  )
  FROM public.surveys s
  LEFT JOIN public.profiles p ON p.id = s.creator_id
  WHERE s.id = _survey_id AND s.is_active = true;
$$;

-- Grant execute to anon and authenticated so the public server fn can call it
-- via a regular (non-service-role) client.
GRANT EXECUTE ON FUNCTION public.get_survey_share_card(uuid) TO anon, authenticated;

-- Disable RLS on survey_response_starts since it is only accessed by
-- SECURITY DEFINER triggers and functions. No direct user access is intended.
ALTER TABLE public.survey_response_starts DISABLE ROW LEVEL SECURITY;
