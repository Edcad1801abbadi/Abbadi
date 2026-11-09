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
  try {
    const { data, error } = await supabase.functions.invoke("get-turn-credentials", {
      method: "GET",
    });

    if (error) {
      throw new Error(error.message || "Edge function invoke failed");
    }

    const iceServers = Array.isArray((data as any)?.iceServers) ? (data as any).iceServers : [];
    if (iceServers.length === 0) {
      throw new Error("No ICE servers returned by edge function");
    }

    return { iceServers, usedFallback: false };
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
