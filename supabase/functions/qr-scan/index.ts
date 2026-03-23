/**
 * 従業員用: QR トークン検証 → qr_session_scans 記録（必要なら自動承認）
 * 環境変数: QR_SIGNING_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { corsHeaders } from "../_shared/cors.ts"
import {
  haversineDistanceM,
  verifyQrToken,
} from "../_shared/qr-crypto.ts"
import { resolveQrSigningSecret } from "../_shared/qr-secret.ts"

type LocationInput = { lat: number; lng: number; accuracy?: number }
type DeviceInput = Record<string, unknown>

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

/** メタデータに監督者位置と半径があれば、端末位置が範囲内なら自動承認 */
function evaluateAutoAccept(
  metadata: unknown,
  loc: LocationInput,
): boolean {
  if (!isRecord(metadata)) return false
  const slat = metadata.supervisor_lat
  const slng = metadata.supervisor_lng
  if (typeof slat !== "number" || typeof slng !== "number") return false
  const radiusM = typeof metadata.radius_m === "number" ? metadata.radius_m : 100
  const acc = typeof loc.accuracy === "number" ? loc.accuracy : 9999
  if (acc > 150) return false
  const d = haversineDistanceM(slat, slng, loc.lat, loc.lng)
  return d <= radiusM + acc
}

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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: {
    token?: string
    location?: LocationInput
    deviceInfo?: DeviceInput
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!body.token || typeof body.token !== "string") {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const loc = body.location
  if (
    !loc ||
    typeof loc.lat !== "number" ||
    typeof loc.lng !== "number" ||
    Number.isNaN(loc.lat) ||
    Number.isNaN(loc.lng)
  ) {
    return new Response(JSON.stringify({ error: "invalid_location" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const verified = await verifyQrToken(secret, body.token)
  if (!verified.ok) {
    return new Response(JSON.stringify({ error: "token_rejected", reason: verified.reason }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  const { payload } = verified

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  const user = userData.user

  const { data: emp, error: empErr } = await userClient
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

  if (emp.tenant_id !== payload.tenantId) {
    return new Response(JSON.stringify({ error: "tenant_mismatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured", detail: "SERVICE_ROLE" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: session, error: sesErr } = await admin
    .from("qr_sessions")
    .select("id, tenant_id, nonce, purpose, expires_at, is_active, uses, max_uses, metadata")
    .eq("id", payload.sessionId)
    .maybeSingle()

  if (sesErr || !session) {
    return new Response(JSON.stringify({ error: "session_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (
    session.nonce !== payload.nonce ||
    session.tenant_id !== payload.tenantId ||
    session.purpose !== payload.purpose
  ) {
    return new Response(JSON.stringify({ error: "session_token_mismatch" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const now = Date.now()
  if (!session.is_active || session.uses >= session.max_uses) {
    return new Response(JSON.stringify({ error: "session_exhausted" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (new Date(session.expires_at).getTime() < now) {
    return new Response(JSON.stringify({ error: "session_expired" }), {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const prevUses = session.uses
  const { data: consumed, error: upErr } = await admin
    .from("qr_sessions")
    .update({
      uses: prevUses + 1,
      is_active: prevUses + 1 >= session.max_uses ? false : session.is_active,
    })
    .eq("id", session.id)
    .eq("uses", prevUses)
    .select("id")
    .maybeSingle()

  if (upErr || !consumed) {
    return new Response(JSON.stringify({ error: "session_already_used" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const autoOk = evaluateAutoAccept(session.metadata, loc)
  const result = autoOk ? "accepted" : "pending"
  const confirmMethod = autoOk ? "auto" : null

  const locationJson = {
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy ?? null,
    provider: "client",
  }
  const deviceJson = isRecord(body.deviceInfo) ? body.deviceInfo : {}

  const { data: scan, error: scanErr } = await admin
    .from("qr_session_scans")
    .insert({
      tenant_id: session.tenant_id,
      session_id: session.id,
      employee_user_id: user.id,
      location: locationJson,
      device_info: deviceJson,
      result,
      confirm_method: confirmMethod,
      audit: {
        token_exp: payload.exp,
        auto_accept_evaluated: true,
        auto_accept: autoOk,
      },
    })
    .select("id, result, scanned_at")
    .single()

  if (scanErr || !scan) {
    console.error("qr_session_scans insert", scanErr)
    return new Response(JSON.stringify({ error: "scan_insert_failed", detail: scanErr?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { error: auditErr } = await admin.from("qr_audit_logs").insert({
    tenant_id: session.tenant_id,
    related_table: "qr_session_scans",
    related_id: scan.id,
    action: "scan",
    actor_user_id: user.id,
    payload: { session_id: session.id, result: scan.result },
  })
  if (auditErr) console.error("qr_audit_logs insert", auditErr)

  return new Response(
    JSON.stringify({
      scanId: scan.id,
      result: scan.result,
      scannedAt: scan.scanned_at,
      sessionId: session.id,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
