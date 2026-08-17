import { Building2, GraduationCap, Globe2, Lock, type LucideIcon } from "lucide-react";

export type Visibility = "campus" | "students" | "everyone" | "private";

export const VISIBILITIES: Visibility[] = ["campus", "students", "everyone", "private"];

export type VisibilityMeta = {
  id: Visibility;
  label: string;
  short: string;
  who: string;
  detail: string;
  icon: LucideIcon;
};

export const VISIBILITY_META: Record<Visibility, VisibilityMeta> = {
  campus: {
    id: "campus",
    label: "Campus-specific",
    short: "Campus only",
    who: "Only people at the selected campus / institution",
    detail:
      "Your survey stays inside the university you pick (or your own campus if you pick none). Nobody outside it can find or answer it.",
    icon: Building2,
  },
  students: {
    id: "students",
    label: "All students",
    short: "Students",
    who: "Any verified student on CampusVerify, from any institution",
    detail:
      "Every eligible student can discover and answer this, no matter which university they belong to. Non-student accounts cannot.",
    icon: GraduationCap,
  },
  everyone: {
    id: "everyone",
    label: "Everyone",
    short: "Everyone",
    who: "Every CampusVerify user — students, researchers and other members",
    detail:
      "The widest reach. Anyone signed in to CampusVerify can find and answer this survey.",
    icon: Globe2,
  },
  private: {
    id: "private",
    label: "Private · invite-only",
    short: "Invite only",
    who: "Only the people you invite by email",
    detail:
      "Hidden from every feed. Only invited email addresses (and you) can open and answer it.",
    icon: Lock,
  },
};

export const visibilityMeta = (v?: string | null): VisibilityMeta =>
  VISIBILITY_META[(v as Visibility) ?? "everyone"] ?? VISIBILITY_META.everyone;
