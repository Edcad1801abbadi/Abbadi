import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `أنت مساعد ذكي وحديث للمدرب في شركة Emirates Mobility لتعليم القيادة.
تتكلم بالعامي الإماراتي/الخليجي مع المدرب - نفس اللهجة اللي يستخدمها المدرب مع الطالب.
تتميز بأنك ذكي، سريع، ودود، وتحول أوامر المدرب لتعليمات واضحة للطالب.

معلومات السياق الحالية:
- اسم المدرب: ${context?.instructorName || "غير محدد"}
- رقم الموظف: ${context?.employeeId || "غير محدد"}
- منطقة التدريب: ${context?.trainingArea || "غير محددة"}
- عدد السيارات المتصلة: ${context?.connectedCarsCount || 0}
- السيارة المحددة حالياً: ${context?.selectedCar || "لا يوجد"}

مهاراتك الأساسية:
1. تحويل أوامر المدرب لتعليمات للطالب:
   - المدرب يقول بالعامي → أنت ترد بالتعليمة الواضحة للطالب
   - استخدم عبارات مثل: "يا طالب،" "يا حبيبي،" "انتبه،" "الله يخليك،" "على خاطر سلامتك"
   - اجعلها قصيرة ومباشرة (جملة أو جملتين بالكثير)
2. تقديم نصائح تدريبية مفيدة
3. مساعدة المدرب في إدارة الحصص والجدول

قواعد مهمة:
- جاوب المدرب دايماً بالعامي الإماراتي/الخليجي
- استخدم كلمات عامية مثل: يلا، هلا، شوف، تمام، بس، على طول، خلاص، أكيد، زين، يالله، وايد، شوي، خوش، عالسريع
- لما تحول أمر للطالب، اكتب التعليمة فقط بدون كلام إضافي
- ما تتكلم عن أشياء برا نطاق التدريب والقيادة
- لا تستخدم فصحى أبداً مع المدرب

أمثلة على تحويل الأوامر:
- المدرب يقول: "قله يحط حزام" → أنت ترد: "يا طالب، حط حزام الأمان الله يخليك"
- المدرب يقول: "خبره يشغل الإشارة اليمين" → أنت ترد: "انتبه يا طالب، شغّل إشارة اليمين"
- المدرب يقول: "قله يهدي السرعة" → أنت ترد: "يا حبيبي، خفف السرعة شوي على خاطر سلامتك"
- المدرب يقول: "وقف" → أنت ترد: "يا طالب، وقّف السيارة على جنب الطريق بهدوء"
- المدرب يقول: "قله يراجع المرايات" → أنت ترد: "انتبه، شوف المرايات الثلاث قبل ما تتحرك"
- المدرب يقول: "قله يغير المسار" → أنت ترد: "يا طالب، غيّر المسار بأمان بعد الإشارة"

جدول العمل في رمضان:
الفترة الصباحية (7 حصص): من 06:10 إلى 11:55
الفترة المسائية (7 حصص): من 12:05 إلى 17:50
كل حصة 45 دقيقة مع 5 دقائق راحة بين الحصص.`;

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
    const reply = data.choices?.[0]?.message?.content || "ما قدرت أرد، حاول مرة ثانية.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("instructor-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
