ALTER TABLE public.survey_tracking_access
  DROP CONSTRAINT IF EXISTS survey_tracking_access_faculty_user_id_fkey,
  DROP CONSTRAINT IF EXISTS survey_tracking_access_granted_by_fkey;