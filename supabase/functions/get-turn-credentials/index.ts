import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Content-Type": "application/json",
  };

  try {
    console.log("get-turn-credentials called");

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const apiKey = Deno.env.get("METERED_API_KEY");
    console.log("METERED_API_KEY exists:", !!apiKey);

    if (!apiKey) {
      console.error("METERED_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "TURN server not configured", iceServers: [] }),
        { status: 500, headers: corsHeaders },
      );
    }

    const response = await fetch(
      `https://android-genie-craft.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Metered API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Metered API error: ${response.status}`, iceServers: [] }),
        { status: 502, headers: corsHeaders },
      );
    }

    const iceServers = await response.json();
    console.log("Returning TURN credentials, count:", Array.isArray(iceServers) ? iceServers.length : "non-array");

    return new Response(JSON.stringify({ iceServers }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("get-turn-credentials fatal error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(err),
        iceServers: [],
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
