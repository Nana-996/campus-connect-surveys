import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { storePartnerSlug } from "@/lib/partner-ref";

export const Route = createFileRoute("/p/$slug")({
  component: PartnerLink,
  head: () => ({
    meta: [
      { title: "Join CampusVerify — verified research responses" },
      { name: "description", content: "Join CampusVerify to run research studies and answer surveys from verified participants." },
      { property: "og:title", content: "Join CampusVerify" },
      { property: "og:description", content: "Verified research participants and survey responses." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function PartnerLink() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.rpc("record_partner_click" as never, { _slug: slug } as never);
      if (data) storePartnerSlug(slug);
      navigate({ to: "/", replace: true });
    })();
  }, [slug, navigate]);
  return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Opening CampusVerify…</div>;
}
