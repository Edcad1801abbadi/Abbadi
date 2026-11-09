import { supabase } from "@/integrations/supabase/client";

export const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export interface TurnCredentialsResult {
  iceServers: RTCIceServer[];
  usedFallback: boolean;
  errorMessage?: string;
}

const normalizeEnvToken = (value: string | undefined): string =>
  value?.trim().replace(/^['"]|['"]$/g, "") ?? "";

const getEdgeBearerToken = async (): Promise<string> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const sessionToken = session?.access_token?.trim();
    if (sessionToken) {
      return sessionToken;
    }
  } catch (error) {
    console.warn("[TURN] Could not read auth session, falling back to publishable key:", error);
  }

  const publishableKey = normalizeEnvToken(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!publishableKey) {
    throw new Error("Missing VITE_SUPABASE_PUBLISHABLE_KEY");
  }

  return publishableKey;
};

export const fetchTurnCredentials = async (): Promise<TurnCredentialsResult> => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim();
  const publishableKey = normalizeEnvToken(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  try {
    if (!projectId) {
      throw new Error("Missing VITE_SUPABASE_PROJECT_ID");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response: Response;
    try {
      response = await fetch(`https://${projectId}.supabase.co/functions/v1/get-turn-credentials`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(publishableKey ? { apikey: publishableKey } : {}),
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let details = "";
      try {
        const errorData = await response.json();
        if (typeof errorData?.error === "string") {
          details = `: ${errorData.error}`;
        }
      } catch {
        // Ignore JSON parse errors for non-JSON responses
      }

      throw new Error(`Edge function returned ${response.status}${details}`);
    }

    const data = await response.json();
    const iceServers = Array.isArray(data?.iceServers) ? data.iceServers : [];

    if (iceServers.length === 0) {
      throw new Error("No ICE servers returned by edge function");
    }

    return {
      iceServers,
      usedFallback: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "TURN fetch failed";
    console.warn("[TURN] Falling back to STUN:", errorMessage);

    return {
      iceServers: FALLBACK_ICE_SERVERS,
      usedFallback: true,
      errorMessage,
    };
  }
};
