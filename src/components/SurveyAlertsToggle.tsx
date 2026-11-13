import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { VAPID_PUBLIC_KEY } from "@/lib/push-config";
import { savePushSubscription, removePushSubscription } from "@/lib/push.functions";

function toKey(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Lets a person turn on phone/browser alerts for new matching surveys. */
export function SurveyAlertsToggle() {
  const save = useServerFn(savePushSubscription);
  const remove = useServerFn(removePushSubscription);
  const [state, setState] = useState<"unsupported" | "off" | "on" | "blocked" | "loading">("loading");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  if (state === "unsupported" || state === "loading") return null;

  const enable = async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      if (!reg) { toast.error("Alerts work on the live site. Open campus-verify.live and try again."); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "blocked" : "off"); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) });
      const j = sub.toJSON();
      await save({ data: { endpoint: sub.endpoint, p256dh: j.keys!.p256dh!, auth: j.keys!.auth! } });
      setState("on");
      toast.success("Survey alerts on. We'll notify you when a survey matches you.");
    } catch {
      toast.error("Couldn't turn on alerts. On iPhone, add CampusVerify to your Home Screen first.");
    }
  };
  const disable = async () => {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await remove({ data: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); }
    setState("off");
  };

  if (state === "blocked") return <p className="text-xs text-muted-foreground">Survey alerts are blocked in your browser settings.</p>;
  return state === "on"
    ? <Button variant="outline" size="sm" onClick={disable}><BellOff className="mr-1 h-4 w-4" />Turn off survey alerts</Button>
    : <Button size="sm" onClick={enable}><Bell className="mr-1 h-4 w-4" />Get alerts for new surveys</Button>;
}
