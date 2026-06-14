// Separate Supabase client used ONLY for password-recovery flows.
// Uses `flowType: 'implicit'` so the reset email link carries the session
// tokens in the URL hash directly (no PKCE code_verifier required).
// This makes the link work cross-device: user can request the reset on
// desktop and open it on mobile (or vice versa).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY!;

export const recoveryClient = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      flowType: "implicit",
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "cv-recovery-auth",
    },
  },
);
