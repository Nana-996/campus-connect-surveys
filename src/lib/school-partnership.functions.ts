import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const slugSchema = z.object({ slug: z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/) });

export type SchoolPartnership = { name: string; domain: string; slug: string };

export const getSchoolPartnership = createServerFn({ method: "GET" })
  .inputValidator((data) => slugSchema.parse(data))
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: result, error } = await client.rpc("get_school_partnership", {
      _slug: data.slug,
    });
    if (error || !result || typeof result !== "object" || Array.isArray(result)) return null;

    const row = result as Record<string, unknown>;
    if (typeof row.name !== "string" || typeof row.domain !== "string" || typeof row.slug !== "string") return null;
    return { name: row.name, domain: row.domain, slug: row.slug } satisfies SchoolPartnership;
  });