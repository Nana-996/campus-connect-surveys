import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Globe, Instagram, Facebook, Linkedin, Youtube, Github, Mail, MessageCircle } from "lucide-react";

export type SocialLink = {
  id: string;
  platform: string;
  label: string | null;
  url: string;
};

const XIcon = (props: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={props.className}>
    <path d="M18.9 2H22l-7.1 8.1L23 22h-6.8l-5-6.6L5.4 22H2.3l7.6-8.7L1.6 2h6.9l4.5 6 5.9-6Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
  </svg>
);

const TikTokIcon = (props: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={props.className}>
    <path d="M16.3 2h-3v13.1a2.6 2.6 0 1 1-2.1-2.6V9.4a5.7 5.7 0 1 0 5.1 5.7V9.2a6.7 6.7 0 0 0 3.9 1.2V7.3a3.9 3.9 0 0 1-3.9-3.9V2Z" />
  </svg>
);

export const PLATFORM_META: Record<string, { label: string; Icon: (p: { className?: string }) => JSX.Element }> = {
  website: { label: "Website", Icon: (p) => <Globe className={p.className} /> },
  x: { label: "X", Icon: (p) => <XIcon className={p.className} /> },
  instagram: { label: "Instagram", Icon: (p) => <Instagram className={p.className} /> },
  facebook: { label: "Facebook", Icon: (p) => <Facebook className={p.className} /> },
  linkedin: { label: "LinkedIn", Icon: (p) => <Linkedin className={p.className} /> },
  youtube: { label: "YouTube", Icon: (p) => <Youtube className={p.className} /> },
  tiktok: { label: "TikTok", Icon: (p) => <TikTokIcon className={p.className} /> },
  github: { label: "GitHub", Icon: (p) => <Github className={p.className} /> },
  whatsapp: { label: "WhatsApp", Icon: (p) => <MessageCircle className={p.className} /> },
  email: { label: "Email", Icon: (p) => <Mail className={p.className} /> },
};

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const meta = PLATFORM_META[platform] ?? PLATFORM_META.website;
  return <meta.Icon className={className ?? "h-4 w-4"} />;
}

/** Small icon row of the admin-managed social / personal website links. */
export function SocialLinks({ className = "" }: { className?: string }) {
  const [links, setLinks] = useState<SocialLink[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("social_links" as any)
        .select("id, platform, label, url")
        .order("sort_order", { ascending: true });
      if (active && data) setLinks(data as unknown as SocialLink[]);
    })();
    return () => { active = false; };
  }, []);

  if (links.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {links.map((l) => {
        const name = l.label || PLATFORM_META[l.platform]?.label || "Link";
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer me"
            title={name}
            aria-label={name}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-foreground/15 bg-card text-muted-foreground shadow-paper transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
          >
            <PlatformIcon platform={l.platform} className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}
