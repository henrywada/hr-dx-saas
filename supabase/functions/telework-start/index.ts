/**
 * テレワーク作業開始: 承認済み端末を検証し telework_sessions を open で作成する。
 * Web: device_identifier（ブラウザの登録識別子）で端末を解決。未署名の device_id 直指定は不可。
 * エージェント: signature + device_id（HMAC）
 * 環境変数: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  createServiceClient,
  requireUserTenant,
} from "../_shared/telework-auth.ts"
import { verifyDeviceSignature } from "../_shared/telework-device-signature.ts"
import {
  jstDateYmdFromIso,
  jstDayStartUtcIsoFromYmd,
  jstNextDayStartUtcIsoFromYmd,
} from "../_shared/jst-date.ts"

type Body = {
  device_id?: string
  device_identifier?: string
  timestamp?: string
  lat?: number
  lon?: number
  ip?: string
  user_agent?: string
  /** エージェント: HMAC 署名モード */
  signature?: string
  /** 署名対象（canonicalStringify で device_id/timestamp と併せて検証） */
  payload?: Record<string, unknown>
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("Authorization")
  const auth = await requireUserTenant(supabaseUrl, anonKey, serviceKey, authHeader)
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  const { userId, tenantId } = auth

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const startAt =
    typeof body.timestamp === "string" && body.timestamp.length > 0
      ? body.timestamp
      : new Date().toISOString()

  const admin = createServiceClient(supabaseUrl, serviceKey)

  const sig =
    typeof body.signature === "string" && body.signature.length > 0
      ? body.signature
      : ""

  let resolvedDeviceId: string

  if (sig) {
    const deviceIdForSig =
      typeof body.device_id === "string" ? body.device_id.trim() : ""
    if (!deviceIdForSig) {
      return new Response(JSON.stringify({ error: "missing_device_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    const payload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload
        : {}
    const ts = body.timestamp ?? startAt
    const v = await verifyDeviceSignature(admin, {
      deviceId: deviceIdForSig,
      timestamp: ts,
      payload,
      signature: sig,
      tenantId,
      userId,
      actorUserId: userId,
    })
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    resolvedDeviceId = v.device.id
  } else {
    const deviceIdentifier =
      typeof body.device_identifier === "string" ? body.device_identifier.trim() : ""
    if (!deviceIdentifier) {
      return new Response(JSON.stringify({ error: "missing_device_identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: device, error: devErr } = await admin
      .from("telework_pc_devices")
      .select("id, tenant_id, user_id, approved, rejected_at")
      .eq("device_identifier", deviceIdentifier)
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle()

    if (devErr || !device) {
      return new Response(
        JSON.stringify({ error: "no_approved_device_for_this_browser" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    if (device.rejected_at) {
      return new Response(JSON.stringify({ error: "device_rejected" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (!device.approved) {
      return new Response(JSON.stringify({ error: "device_not_approved" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    resolvedDeviceId = device.id
  }

  const { data: openRow } = await admin
    .from("telework_sessions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("status", "open")
    .is("end_at", null)
    .maybeSingle()

  if (openRow?.id) {
    return new Response(JSON.stringify({ error: "session_already_open" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // 1 日 1 セッション（JST）: 本日すでに開始済みの行があれば新規開始不可
  const dayYmd = jstDateYmdFromIso(startAt)
  const dayStartIso = jstDayStartUtcIsoFromYmd(dayYmd)
  const dayEndIso = jstNextDayStartUtcIsoFromYmd(dayYmd)
  const { data: todaySessions, error: todayErr } = await admin
    .from("telework_sessions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .gte("start_at", dayStartIso)
    .lt("start_at", dayEndIso)
    .limit(1)

  if (todayErr) {
    console.error("telework-start today check", todayErr)
    return new Response(JSON.stringify({ error: "today_session_check_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (todaySessions && todaySessions.length > 0) {
    return new Response(JSON.stringify({ error: "session_already_recorded_today" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const xf = req.headers.get("x-forwarded-for")
  const forwardedIp = xf?.split(",")[0]?.trim() ?? null
  const clientIp =
    typeof body.ip === "string" && body.ip.length > 0 ? body.ip : forwardedIp

  const insertRow = {
    tenant_id: tenantId,
    user_id: userId,
    device_id: resolvedDeviceId,
    start_at: startAt,
    start_lat: typeof body.lat === "number" ? body.lat : null,
    start_lon: typeof body.lon === "number" ? body.lon : null,
    start_ip: clientIp,
    start_user_agent:
      typeof body.user_agent === "string" ? body.user_agent : null,
    status: "open",
  }

  const { data: inserted, error: insErr } = await admin
    .from("telework_sessions")
    .insert(insertRow)
    .select("id")
    .single()

  if (insErr || !inserted) {
    console.error("telework-start insert", insErr)
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({ session_id: inserted.id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
