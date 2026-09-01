ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS allow_response_download boolean NOT NULL DEFAULT false;