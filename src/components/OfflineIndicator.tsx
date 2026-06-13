import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { WifiOff, CloudUpload, Check } from "lucide-react";
import { onQueueChange, syncQueuedResponses } from "@/lib/offline-sync";
import { queueCount } from "@/lib/offline-store";

function isSurveyAnswerPage(pathname: string): boolean {
  // Only show offline indicator when the user is actively taking a survey
  return /^\/survey\/[^/]+$/.test(pathname);
}

export function OfflineIndicator() {
  const location = useLocation();
  const onSurveyPage = isSurveyAnswerPage(location.pathname);

  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pending, setPending] = useState(0);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const n = await queueCount();
      if (active) setPending(n);
    };
    refresh();
    const off = onQueueChange(() => {
      refresh();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
    });
    const iv = setInterval(refresh, 8000);
    return () => { active = false; off(); clearInterval(iv); };
  }, []);

  if (!onSurveyPage) return null;
  if (online && pending === 0 && !justSynced) return null;

  const label = !online
    ? "Offline — answers will save locally"
    : pending > 0
    ? `Syncing ${pending} answer${pending === 1 ? "" : "s"}…`
    : "All answers synced";
  const Icon = !online ? WifiOff : pending > 0 ? CloudUpload : Check;
  const tone = !online
    ? "bg-foreground text-background"
    : pending > 0
    ? "bg-highlight text-highlight-foreground"
    : "bg-primary text-primary-foreground";

  return (
    <button
      onClick={() => online && pending > 0 && syncQueuedResponses()}
      className={`fixed bottom-3 left-1/2 z-50 -translate-x-1/2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold shadow-paper ${tone}`}
      aria-live="polite"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
