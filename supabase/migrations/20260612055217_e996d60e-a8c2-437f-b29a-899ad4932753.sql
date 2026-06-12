
-- Polls system: free to post, free to answer, no credit ledger involvement.
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question text NOT NULL,
  type text NOT NULL CHECK (type IN ('choice','rating')),
  options text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active polls" ON public.polls
  FOR SELECT TO authenticated
  USING (is_active = true AND expires_at > now() OR creator_id = auth.uid());

CREATE POLICY "Authenticated can create own polls" ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND char_length(trim(question)) BETWEEN 1 AND 200
    AND type IN ('choice','rating')
    AND (
      (type = 'rating' AND array_length(options, 1) IS NULL)
      OR (type = 'choice' AND array_length(options, 1) BETWEEN 2 AND 4)
    )
  );

CREATE POLICY "Creators can update own polls" ON public.polls
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can delete own polls" ON public.polls
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

CREATE TRIGGER polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


CREATE TABLE public.poll_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  respondent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, respondent_id)
);

GRANT SELECT, INSERT ON public.poll_responses TO authenticated;
GRANT ALL ON public.poll_responses TO service_role;

ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote once" ON public.poll_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    respondent_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_id AND p.is_active = true AND p.expires_at > now()
    )
  );

CREATE POLICY "Respondent can view own vote" ON public.poll_responses
  FOR SELECT TO authenticated
  USING (respondent_id = auth.uid());

CREATE POLICY "Creator can view own poll responses" ON public.poll_responses
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.creator_id = auth.uid()));

CREATE INDEX poll_responses_poll_idx ON public.poll_responses(poll_id);


-- Aggregated results, no voter identities exposed.
CREATE OR REPLACE FUNCTION public.get_poll_results(_poll_id uuid)
RETURNS TABLE(answer text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT answer, COUNT(*)::bigint AS count
  FROM public.poll_responses
  WHERE poll_id = _poll_id
  GROUP BY answer;
$$;

GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO authenticated;


-- SECURITY FIX: restrict Realtime channel subscriptions to topics the user owns.
-- Without these policies any authenticated user can subscribe to any topic, including
-- per-user channels like `profile-<other_uid>`.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users subscribe to own profile channel"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    realtime.topic() = 'profile-' || auth.uid()::text
  );
