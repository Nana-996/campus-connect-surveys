import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isAppOwnerClaims } from "@/lib/app-owner";

// Only interaction events may come from the browser. Payments and leads are
// measured at their database transitions, not from caller-supplied claims.
export const trackConversion = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    event: z.enum(["buyer_cta_click", "pricing_view", "upgrade_prompt_view"]),
    source: z.enum(["homepage", "pricing", "create"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) throw new Error("Invalid request origin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("conversion_events").insert(data);
    if (error) throw new Error("Could not record interaction");
    return { ok: true };
  });

export const getConversionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isAppOwnerClaims(context.claims as Record<string, unknown>)) throw new Error("Forbidden: app owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("conversion_summary");
    if (error) throw new Error("Could not load conversion measurements");
    return data as unknown as Array<{ event: string; total: number; last_30_days: number }>;
  });