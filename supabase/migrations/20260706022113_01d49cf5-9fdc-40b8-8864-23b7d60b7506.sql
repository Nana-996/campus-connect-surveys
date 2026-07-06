-- Tighten profiles INSERT policy so client-controlled inserts cannot escalate credits/flags/user_type.
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
CREATE POLICY "Profiles: insert own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND earned_credits IN (0, 5, 10)
    AND paid_credits = 0
    AND is_flagged = false
    AND flag_reason IS NULL
    AND user_type IN ('student','general')
  );