CREATE TABLE public.survey_access_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by uuid NOT NULL,
  invited_by_admin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_access_invites_status_chk CHECK (status IN ('pending','accepted','revoked'))
);
CREATE INDEX survey_access_invites_survey_idx ON public.survey_access_invites(survey_id);
GRANT ALL ON public.survey_access_invites TO service_role;
ALTER TABLE public.survey_access_invites ENABLE ROW LEVEL SECURITY;
-- No client policies: all reads/writes go through authorized server functions.

CREATE TRIGGER update_survey_access_invites_updated_at BEFORE UPDATE ON public.survey_access_invites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP FUNCTION IF EXISTS public.admin_grant_survey_tracking_access_by_email(uuid, text);
DROP FUNCTION IF EXISTS public.admin_revoke_survey_tracking_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.admin_list_survey_tracking_access(uuid);