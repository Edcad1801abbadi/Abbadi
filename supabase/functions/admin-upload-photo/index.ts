import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-pin",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_PIN = Deno.env.get("ADMIN_PIN") ?? "";
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Anon-key gate
    const authHeader = req.headers.get("authorization") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const pubKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const isKnownKey =
      (anonKey && authHeader.includes(anonKey)) ||
      (pubKey && authHeader.includes(pubKey));
    if (!isKnownKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fail closed when the ADMIN_PIN secret is not configured
    if (!ADMIN_PIN) {
      console.error("ADMIN_PIN secret is not configured; rejecting request");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pin = req.headers.get("x-admin-pin") || "";
    if (!pin || pin !== ADMIN_PIN) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const empIdRaw = form.get("employee_id");
    if (!(file instanceof File) || !empIdRaw) {
      return new Response(JSON.stringify({ error: "Missing file or employee_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const employeeId = parseInt(String(empIdRaw), 10);
    if (!Number.isFinite(employeeId)) {
      return new Response(JSON.stringify({ error: "Invalid employee_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File too large (max 5MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const extMap: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const ext = extMap[file.type];
    const path = `${employeeId}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from("instructor-photos")
      .upload(path, bytes, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage
      .from("instructor-photos")
      .getPublicUrl(path);
    const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    const { error: updErr } = await supabase
      .from("instructors")
      .update({ photo_url: publicUrl })
      .eq("employee_id", employeeId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ photo_url: publicUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-upload-photo error:", err);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
