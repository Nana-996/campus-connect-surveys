-- Make the fail-closed write protection on survey_tracking_access explicit so
-- future scanners can see the intent and to defend against a future broad
-- "allow all" policy being added by mistake.
DROP POLICY IF EXISTS "Block direct inserts on tracking access" ON public.survey_tracking_access;
DROP POLICY IF EXISTS "Block direct updates on tracking access" ON public.survey_tracking_access;
DROP POLICY IF EXISTS "Block direct deletes on tracking access" ON public.survey_tracking_access;

CREATE POLICY "Block direct inserts on tracking access"
ON public.survey_tracking_access
FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Block direct updates on tracking access"
ON public.survey_tracking_access
FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Block direct deletes on tracking access"
ON public.survey_tracking_access
FOR DELETE TO authenticated, anon
USING (false);
