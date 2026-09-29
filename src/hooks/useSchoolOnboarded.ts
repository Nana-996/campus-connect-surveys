import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Student price = half of the General / Researcher price. */
export const STUDENT_PRICE_FACTOR = 0.5;

/** True when the signed-in user's school is onboarded (active/trial plan). */
export function useSchoolOnboarded() {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["my-school-onboarded", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_school_onboarded" as never);
      if (error) throw error;
      return Boolean(data);
    },
  });
  return { onboarded: q.data ?? false, loading: !!user && q.isLoading };
}
