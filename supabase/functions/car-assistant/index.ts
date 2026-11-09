import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_CONFIG: Record<string, { name: string; reply: string; rule: string }> = {
  // Arabic: speak colloquial Gulf/UAE dialect (عامي خليجي/إماراتي)
  ar: {
    name: "العربية (عامي)",
    reply: "جاوب دايماً بالعامي الإماراتي/الخليجي زي ما الناس تتكلم في حياتهم اليومية - لا تستخدم فصحى أبداً",
    rule: "كن ودود وقريب من الطالب، جملة أو جملتين بالكثير، استخدم كلمات بسيطة مثل: هلا، يلا، شوف، تمام، بس، على طول، خلاص، أكيد، زين، يالله",
  },
  en: { name: "English", reply: "Always reply in English", rule: "Be concise and helpful (2-3 sentences max)" },
  ur: { name: "اردو", reply: "ہمیشہ اردو میں جواب دیں", rule: "مختصر اور مفید رہیں (زیادہ سے زیادہ 2-3 جملے)" },
  ps: { name: "پښتو", reply: "تل په پښتو کې ځواب ورکړئ", rule: "لنډ او ګټور اوسئ (تر ۲-۳ جملو پورې)" },
  ml: { name: "മലയാളം", reply: "എപ്പോഴും മലയാളത്തിൽ മറുപടി നൽകുക", rule: "സംക്ഷിപ്തവും ഉപയോഗപ്രദവുമായിരിക്കുക (പരമാവധി 2-3 വാക്യങ്ങൾ)" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const isKnownProjectKey =
      (anonKey && authHeader.includes(anonKey)) ||
      (publishableKey && authHeader.includes(publishableKey));

    if (!isKnownProjectKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { messages, context, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = LANG_CONFIG[language] || LANG_CONFIG.ar;

    const systemPrompt = `You are a friendly, modern AI assistant for a driving student at Emirates Mobility.
You talk like a close friend sitting next to the student in the car - relaxed, warm, supportive.

Current context:
- Car number: ${context?.carNumber || "unknown"}
- Training area: ${context?.trainingArea || "unknown"}
- Current session: ${context?.currentSession || "unknown"}
- Time remaining: ${context?.remainingTime || "unknown"}
- Shift: ${context?.shift || "unknown"}
- Ramadan day: ${context?.ramadanDay || "N/A"}

Ramadan schedule:
Morning shift (7 sessions): 06:10 to 11:55
Evening shift (7 sessions): 12:05 to 17:50
Each session is 45 minutes with 5-minute breaks.

Your tasks:
1. Answer questions about schedule, sessions, and times
2. Give simple driving tips in a friendly way
3. Remind about safety (with warmth, not strict)
4. Help understand instructions
5. Encourage and motivate the student

Rules:
- ${lang.reply}
- ${lang.rule}
- Stay focused on driving training only
- Use emojis occasionally (1-2 per reply max) to feel more human
- Sound like a real friend, not a textbook`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "...";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("car-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
