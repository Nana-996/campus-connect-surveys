import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";


const CANONICAL_IDS = [
  "tech","ai","gaming","science","health","fitness","mental_health","food",
  "travel","fashion","beauty","music","film","books","sports","finance",
  "business","politics","education","environment","parenting","relationships",
  "art","other",
] as const;

const SYSTEM_PROMPT = `You are a tag normalizer. The user supplies one short free-text interest. You MUST map it to exactly ONE id from this fixed list, picking the closest semantic match. Only use "other" when nothing else fits at all.

Allowed ids: ${CANONICAL_IDS.join(", ")}

Examples:
- "crypto" -> finance
- "weight lifting" -> fitness
- "k-pop" -> music
- "anime" -> film
- "machine learning" -> ai
- "startups" -> business
- "hiking" -> travel
- "cooking" -> food
- "therapy" -> mental_health

Reply strictly as JSON: {"tag":"<id>","confidence":0.0-1.0}.`;

export const normalizeInterestTag = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({
      raw: z.string().trim().min(1).max(60),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { tag: "other" as const, confidence: 0, source: "fallback" as const };
    }

    // Fast cheap exact match first
    const lower = data.raw.toLowerCase().replace(/\s+/g, "_");
    if ((CANONICAL_IDS as readonly string[]).includes(lower)) {
      return { tag: lower, confidence: 1, source: "exact" as const };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: data.raw },
          ],
        }),
      });
      if (!res.ok) {
        return { tag: "other" as const, confidence: 0, source: "fallback" as const };
      }
      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(content);
      const tag = String(parsed.tag ?? "").toLowerCase();
      const confidence = Number(parsed.confidence ?? 0.5);
      if (!(CANONICAL_IDS as readonly string[]).includes(tag)) {
        return { tag: "other" as const, confidence: 0, source: "fallback" as const };
      }
      return { tag, confidence, source: "ai" as const };
    } catch {
      return { tag: "other" as const, confidence: 0, source: "fallback" as const };
    }
  });
