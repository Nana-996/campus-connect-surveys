
DROP POLICY IF EXISTS "share_tokens: creator insert" ON public.survey_share_tokens;
CREATE POLICY "share_tokens: creator insert"
ON public.survey_share_tokens
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_share_tokens.survey_id
      AND s.creator_id = auth.uid()
      AND (
        s.tier IN ('boosted','pro')
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.paid_credits >= 5
        )
      )
  )
);

DROP POLICY IF EXISTS "report_views: creator insert" ON public.survey_report_views;
CREATE POLICY "report_views: creator insert"
ON public.survey_report_views
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_report_views.survey_id
      AND s.creator_id = auth.uid()
      AND (
        s.tier IN ('boosted','pro')
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.paid_credits >= 5
        )
      )
  )
);
