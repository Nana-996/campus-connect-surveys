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
  earned_credits: number;
  paid_credits: number;
  is_flagged?: boolean;
  flag_reason?: string | null;
  user_type?: "student" | "general";
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  isPreviewMode: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  enterPreviewMode: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);
const PREVIEW_MODE_KEY = "campusverify-preview-mode";
const previewUser = { id: "preview-student", email: "student@campus.edu" } as User;
const previewProfile: Profile = {
  id: "preview-student",
  full_name: "Preview Student",
  university_name: "Campus University",
  university_domain: "campus.edu",
  department: "Research Methods",
  year: "Year 3",
  earned_credits: 4,
  paid_credits: 12,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (authUser: User) => {
    setProfileError(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (error) throw error;
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
        earned_credits: 3,
        paid_credits: 0,
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
      throw retryError ?? createError;
    }
    setProfile((created as unknown as Profile | null) ?? null);
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
      else {
        const previewEnabled = localStorage.getItem(PREVIEW_MODE_KEY) === "true";
        if (previewEnabled) {
          setIsPreviewMode(true);
          setProfile(previewProfile);
        }
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    user: session?.user ?? (isPreviewMode ? previewUser : null),
    session,
    profile,
    isPreviewMode,
    loading,
    enterPreviewMode: () => {
      localStorage.setItem(PREVIEW_MODE_KEY, "true");
      setIsPreviewMode(true);
      setProfile(previewProfile);
    },
    refreshProfile: async () => {
      if (isPreviewMode) return;
      if (session?.user) await loadProfile(session.user);
    },
    signOut: async () => {
      localStorage.removeItem(PREVIEW_MODE_KEY);
      setIsPreviewMode(false);
      setProfile(null);
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
