import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VAPID_PUBLIC_KEY, matchesSurveyAudience } from "./push-config";

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    endpoint: z.string().url().startsWith("https://").max(1000),
    p256dh: z.string().min(10).max(300),
    auth: z.string().min(4).max(100),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Endpoint is unique per browser; re-bind it to the current user.
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    const { error } = await context.supabase.from("push_subscriptions")
      .insert({ user_id: context.userId, ...data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ endpoint: z.string().max(1000) }).parse(i))
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

export const notifySurveyPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ surveyId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: s } = await context.supabase.from("surveys")
      .select("id, slug, title, creator_id, visibility, university_domain, target_universities, push_notified_at")
      .eq("id", data.surveyId).maybeSingle();
    if (!s || s.creator_id !== context.userId) throw new Error("Not allowed");
    if (s.push_notified_at || s.visibility === "private") return { sent: 0 };
    const privateKey = process.env["VAPID_PRIVATE_KEY"];
    if (!privateKey) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("surveys").update({ push_notified_at: new Date().toISOString() }).eq("id", s.id);

    const { data: subs } = await supabaseAdmin.from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth").limit(5000);
    if (!subs?.length) return { sent: 0 };
    const ids = [...new Set(subs.map((x) => x.user_id))];
    const { data: people } = await supabaseAdmin.from("profiles")
      .select("id, user_type, university_domain").in("id", ids);
    const ok = new Set((people ?? []).filter((p) => matchesSurveyAudience(
      { ...s, target_universities: s.target_universities ?? [] }, p as any)).map((p) => p.id));

    const { buildPushPayload } = await import("@block65/webcrypto-web-push");
    const vapid = { subject: "mailto:founder@campus-verify.live", publicKey: VAPID_PUBLIC_KEY, privateKey };
    const body = JSON.stringify({
      title: "New survey for you",
      body: `${s.title.slice(0, 100)} — tap to answer and earn credits.`,
      url: `/survey/${s.slug ?? s.id}`,
    });
    let sent = 0;
    const dead: string[] = [];
    await Promise.allSettled(subs.filter((x) => ok.has(x.user_id)).map(async (x) => {
      const payload = await buildPushPayload({ data: body, options: { ttl: 86400 } },
        { endpoint: x.endpoint, expirationTime: null, keys: { p256dh: x.p256dh, auth: x.auth } }, vapid);
      const res = await fetch(x.endpoint, payload as any);
      if (res.status === 404 || res.status === 410) dead.push(x.id); else if (res.ok) sent++;
    }));
    if (dead.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", dead);
    return { sent };
  });
