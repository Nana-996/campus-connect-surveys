import { useServerFn } from "@tanstack/react-start";
import { useCallback, useRef } from "react";
import { trackConversion } from "@/lib/conversion.functions";

export function useConversionTracking(source: "homepage" | "pricing" | "create") {
  const send = useServerFn(trackConversion);
  const seen = useRef(new Set<string>());
  return useCallback((event: "buyer_cta_click" | "pricing_view" | "upgrade_prompt_view", once = false) => {
    if (once && seen.current.has(event)) return;
    seen.current.add(event);
    void send({ data: { event, source } }).catch(() => {});
  }, [send, source]);
}