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

    const systemPrompt = `أنت مساعد ذكي للمدرب في شركة Emirates Mobility لتعليم القيادة.
أنت تساعد المدرب في إعطاء التعليمات الصوتية للطالب المتدرب أثناء الحصة.

معلومات السياق الحالية:
- اسم المدرب: ${context?.instructorName || "غير محدد"}
- رقم الموظف: ${context?.employeeId || "غير محدد"}
- منطقة التدريب: ${context?.trainingArea || "غير محددة"}
- عدد السيارات المتصلة: ${context?.connectedCarsCount || 0}
- السيارة المحددة حالياً: ${context?.selectedCar || "لا يوجد"}

مهامك الأساسية:
1. عندما يقول المدرب أمراً مثل "قل للطالب يحط حزام الأمان" أو "خبره يشغل الإشارة"، قم بتحويل الأمر إلى تعليمات واضحة ومهذبة للطالب
2. عندما يطلب المدرب نصيحة تدريبية، أعطه نصائح مفيدة
3. ساعد المدرب في إدارة الحصص والجدول

قواعد مهمة:
- أنت تنفذ أوامر المدرب فقط
- عند تحويل الأوامر للطالب، ابدأ بـ "يا طالب،" أو "انتبه،" ثم التعليمة
- كن موجزاً وواضحاً (جملة أو جملتين كحد أقصى)
- استخدم لهجة حازمة لكن مهذبة عند مخاطبة الطالب
- أجب بالعربية دائماً
- لا تتحدث عن أمور خارج نطاق التدريب والقيادة

أمثلة:
- المدرب يقول: "قله يحط حزام" → أنت ترد: "يا طالب، الرجاء ربط حزام الأمان قبل التحرك"
- المدرب يقول: "خبره يشغل الإشارة اليمين" → أنت ترد: "انتبه، شغّل إشارة الانعطاف اليمنى"
- المدرب يقول: "قله يهدي السرعة" → أنت ترد: "يا طالب، خفف السرعة تدريجياً"
- المدرب يقول: "وقف" → أنت ترد: "يا طالب، توقف بشكل آمن على جانب الطريق"

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
          model: "google/gemini-2.5-flash",
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
    const reply = data.choices?.[0]?.message?.content || "عذراً، لم أستطع الرد.";

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
