/**
 * 上司用: QR セッション作成（qr_sessions + HMAC 署名トークン）
 * 環境変数: QR_SIGNING_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { corsHeaders } from "../_shared/cors.ts"
import { signQrToken } from "../_shared/qr-crypto.ts"
import { resolveQrSigningSecret } from "../_shared/qr-secret.ts"

// QR（監督者が表示する一時的なQR）の有効期限
// 従業員がスキャンして承認まで行うため、十分な余裕を持たせる
const SESSION_TTL_MS = 180_000
const PURPOSES = new Set(["punch_in", "punch_out"])

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const secret = resolveQrSigningSecret()
  if (!secret) {
    return new Response(
      JSON.stringify({
        error: "server_misconfigured",
        detail:
          "QR_SIGNING_SECRET が未設定か短すぎます（16文字以上）。本番では supabase secrets set で設定してください。",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: { purpose?: string; metadata?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const purpose = body.purpose
  if (!purpose || !PURPOSES.has(purpose)) {
    return new Response(JSON.stringify({ error: "invalid_purpose" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  const user = userData.user

  const { data: emp, error: empErr } = await supabase
    .from("employees")
    .select("tenant_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (empErr || !emp?.tenant_id) {
    return new Response(JSON.stringify({ error: "employee_not_found" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const nonce = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  const metadata =
    body.metadata && typeof body.metadata === "object" ? body.metadata : {}

  const { data: row, error: insErr } = await supabase
    .from("qr_sessions")
    .insert({
      tenant_id: emp.tenant_id,
      supervisor_user_id: user.id,
      purpose,
      expires_at: expiresAt,
      nonce,
      max_uses: 1,
      uses: 0,
      is_active: true,
      metadata,
    })
    .select("id, expires_at")
    .single()

  if (insErr || !row) {
    console.error("qr_sessions insert", insErr)
    return new Response(JSON.stringify({ error: "insert_failed", detail: insErr?.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const expUnix = Math.floor(new Date(row.expires_at).getTime() / 1000)
  const token = await signQrToken(secret, {
    sessionId: row.id,
    exp: expUnix,
    tenantId: emp.tenant_id,
    nonce,
    purpose,
  })

  return new Response(
    JSON.stringify({
      sessionId: row.id,
      expiresAt: row.expires_at,
      token,
      nonce,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
