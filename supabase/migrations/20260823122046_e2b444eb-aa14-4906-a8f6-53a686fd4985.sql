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
    'questions', s.questions,
    'is_evaluation', s.is_evaluation,
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
  WHERE s.id = _survey_id
    AND s.is_active = true
    AND s.allow_general_respondents = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_survey_share_card(uuid) TO anon, authenticated;