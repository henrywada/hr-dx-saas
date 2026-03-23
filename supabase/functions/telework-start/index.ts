/**
 * テレワーク作業開始: 承認済み端末を検証し telework_sessions を open で作成する。
 * 環境変数: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  createServiceClient,
  requireUserTenant,
} from "../_shared/telework-auth.ts"
import { verifyDeviceSignature } from "../_shared/telework-device-signature.ts"

type Body = {
  device_id?: string
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

  const deviceId = typeof body.device_id === "string" ? body.device_id : ""
  if (!deviceId) {
    return new Response(JSON.stringify({ error: "missing_device_id" }), {
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

  if (sig) {
    const payload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload
        : {}
    const ts = body.timestamp ?? startAt
    const v = await verifyDeviceSignature(admin, {
      deviceId,
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
  } else {
    const { data: device, error: devErr } = await admin
      .from("telework_pc_devices")
      .select("id, tenant_id, user_id, approved")
      .eq("id", deviceId)
      .maybeSingle()

    if (devErr || !device) {
      return new Response(JSON.stringify({ error: "device_not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (device.tenant_id !== tenantId) {
      return new Response(JSON.stringify({ error: "tenant_mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (device.user_id !== userId) {
      return new Response(JSON.stringify({ error: "device_user_mismatch" }), {
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

  const xf = req.headers.get("x-forwarded-for")
  const forwardedIp = xf?.split(",")[0]?.trim() ?? null
  const clientIp =
    typeof body.ip === "string" && body.ip.length > 0 ? body.ip : forwardedIp

  const insertRow = {
    tenant_id: tenantId,
    user_id: userId,
    device_id: deviceId,
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
