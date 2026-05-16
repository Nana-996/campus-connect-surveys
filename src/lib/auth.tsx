import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  university_name: string;
  university_domain: string;
  department: string;
  year: string;
  credits: number;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (authUser: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
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

    const { data: created } = await supabase
      .from("profiles")
      .insert({
        id: authUser.id,
        full_name: metadata.full_name ?? "",
        university_name: universityName,
        university_domain: emailDomain,
        department: metadata.department ?? "",
        year: metadata.year ?? "",
        credits: 5,
      })
      .select("*")
      .single();
    setProfile((created as Profile | null) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user), 0);
      } else {
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    profile,
    loading,
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user);
    },
    signOut: async () => {
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
