/**
 * 上司用: QR セッション作成（監督者位置を metadata に保存 → ジオフェンス用）
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { corsHeaders } from "../_shared/cors.ts"
import { signQrToken } from "../_shared/qr-crypto.ts"
import { resolveQrSigningSecret } from "../_shared/qr-secret.ts"

// 画面にカウントダウンは出さないが、署名 exp 用に十分長く取る
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const PURPOSES = new Set(["punch_in", "punch_out"])

type SupervisorLocation = { lat: number; lng: number; accuracy?: number }

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

  let body: {
    purpose?: string
    metadata?: Record<string, unknown>
    supervisorLocation?: SupervisorLocation
  }
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

  const sl = body.supervisorLocation
  if (
    !sl ||
    typeof sl.lat !== "number" ||
    typeof sl.lng !== "number" ||
    Number.isNaN(sl.lat) ||
    Number.isNaN(sl.lng)
  ) {
    return new Response(JSON.stringify({ error: "missing_supervisor_location" }), {
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

  const baseMeta =
    body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? { ...body.metadata }
      : {}
  const metadata: Record<string, unknown> = {
    ...baseMeta,
    supervisor_lat: sl.lat,
    supervisor_lng: sl.lng,
  }
  if (typeof sl.accuracy === "number" && !Number.isNaN(sl.accuracy)) {
    metadata.supervisor_accuracy_m = sl.accuracy
  }
  if (typeof metadata.radius_m !== "number" || Number.isNaN(metadata.radius_m as number)) {
    metadata.radius_m = 100
  }

  const nonce = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

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
