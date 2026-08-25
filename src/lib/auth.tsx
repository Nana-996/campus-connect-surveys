import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { markActive, clearActivity, isSessionStale, startSession, getLastLogin } from "@/lib/session-activity";
import { clearStoredReferralCode, storedReferralCode } from "@/lib/referral";


export type Profile = {
  id: string;
  full_name: string;
  university_name: string;
  university_domain: string;
  department: string;
  year: string;
  earned_credits: number;
  paid_credits: number;
  is_flagged?: boolean;
  flag_reason?: string | null;
  user_type?: "student" | "general";
  country?: string | null;
  age_range?: string | null;
  interests?: string[];
  interests_raw?: string[];
};


type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

const fallbackProfileFor = (authUser: User): Profile => {
  const emailDomain = authUser.email?.split("@")[1]?.toLowerCase() ?? "";
  const metadata = authUser.user_metadata ?? {};
  const userType = metadata.user_type === "general" ? "general" : "student";
  return {
    id: authUser.id,
    full_name: metadata.full_name ?? authUser.email?.split("@")[0] ?? "",
    university_name: metadata.university_name ?? (userType === "general" ? "General" : `${emailDomain.split(".")[0] || "Campus"} University`),
    university_domain: emailDomain,
    department: userType === "student" ? metadata.department ?? "" : "",
    year: userType === "student" ? metadata.year ?? "" : "",
    earned_credits: userType === "student" ? 10 : 5,
    paid_credits: 0,
    user_type: userType,
  };
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (authUser: User) => {
    setProfileError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (error) {
      console.warn("Profile lookup failed; continuing with a temporary profile.", error);
      setProfile(fallbackProfileFor(authUser));
      return;
    }
    if (data) {
      setProfile(data as Profile);
      return;
    }

    const emailDomain = authUser.email?.split("@")[1]?.toLowerCase() ?? "";
    const metadata = authUser.user_metadata ?? {};
    const universityName =
      metadata.university_name ??
      (emailDomain
        ? `${emailDomain.split(".")[0].replace(/^./, (c) => c.toUpperCase())} University`
        : "University");

    const userType = metadata.user_type === "general" ? "general" : "student";
    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        full_name: metadata.full_name ?? "",
        university_name: universityName,
        university_domain: emailDomain,
        department: metadata.department ?? "",
        year: metadata.year ?? "",
        earned_credits: userType === "student" ? 10 : 5,
        user_type: userType,
      })
      .select("*")
      .single();
    if (createError) {
      const { data: retry, error: retryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      if (retry) {
        setProfile(retry as Profile);
        return;
      }
      console.warn("Profile creation failed; continuing with a temporary profile.", retryError ?? createError);
      setProfile(fallbackProfileFor(authUser));
      return;
    }
    setProfile((created as unknown as Profile | null) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        if (getLastLogin() === null) startSession(true);
        markActive();
        setTimeout(() => {
          loadProfile(s.user).catch((err) => {
            setProfile(null);
            setProfileError(err.message ?? "Could not load your profile.");
          });
        }, 0);
      } else {
        setProfile(null);
        setProfileError(null);
      }
    });
    supabase.auth.getSession().then(async ({ data }) => {
      // Stay signed in across visits, but drop the session after a long gap.
      if (data.session?.user && isSessionStale()) {
        clearActivity();
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session?.user) {
        if (getLastLogin() === null) startSession(true);
        markActive();
        loadProfile(data.session.user)
          .catch((err) => {
            setProfile(null);
            setProfileError(err.message ?? "Could not load your profile.");
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Attribute a stored referral code once the account exists. The server
  // awards the referrer's credits (once per referred account) and rejects
  // self-referrals or repeat claims.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const code = storedReferralCode();
    if (!code) return;
    void (async () => {
      const { data, error } = await supabase.rpc("claim_referral", { _code: code });
      const result = (data ?? null) as { ok?: boolean; reason?: string } | null;
      // Clear unless the profile row simply isn't ready yet.
      if (!error && result?.reason !== "no_profile") clearStoredReferralCode();
    })();
  }, [session?.user?.id, profile?.id]);


  useEffect(() => {
    if (!session?.user) return;
    markActive();
    const onVisible = () => {
      if (document.visibilityState === "visible") markActive();
    };
    document.addEventListener("visibilitychange", onVisible);
    const id = window.setInterval(markActive, 5 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(id);
    };
  }, [session?.user?.id]);


  // Live-sync profile so admin credit grants & trigger updates appear immediately.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    const channel = supabase
      .channel(`profile-${uid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` },
        (payload) => {
          setProfile((prev) => (prev ? { ...prev, ...(payload.new as Partial<Profile>) } : (payload.new as Profile)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    profile,
    profileError,
    loading,
    signIn: async (email, password, remember = true) => {
      setProfileError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      startSession(remember);
      setSession(data.session);
      if (data.user) await loadProfile(data.user);
    },
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user);
    },
    signOut: async () => {
      setProfile(null);
      clearActivity();
      await supabase.auth.signOut();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
