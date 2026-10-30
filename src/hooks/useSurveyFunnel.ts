import { useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recordSurveyFunnel } from "@/lib/survey-funnel.functions";
import { surveyAttemptToken } from "@/lib/survey-funnel";

export function useSurveyFunnel(surveyId: string) {
  const record = useServerFn(recordSurveyFunnel);
  const tokenRef = useRef<string | null>(null);
  const requests = useRef(new Map<string, Promise<void>>());
  const getToken = useCallback(() => {
    if (tokenRef.current) return tokenRef.current;
    try { tokenRef.current = surveyAttemptToken(localStorage, surveyId, () => crypto.randomUUID()); }
    catch { tokenRef.current = crypto.randomUUID(); }
    return tokenRef.current;
  }, [surveyId]);
  const track = useCallback((stage: "started" | "signup") => {
    const token = getToken();
    const key = `${surveyId}:${token}:${stage}`;
    const pending = requests.current.get(key);
    if (pending) return pending;
    const request = record({ data: { surveyId, token, stage } }).then(() => {}).catch(() => { requests.current.delete(key); });
    requests.current.set(key, request);
    return request;
  }, [getToken, record, surveyId]);
  return { track, getToken };
}