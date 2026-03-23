/**
 * PC エージェント用: telework_pc_logs へイベントを一括投入。
 * 承認済み端末かつ JWT ユーザと device.user_id が一致することを検証する。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  createServiceClient,
  requireUserTenant,
} from "../_shared/telework-auth.ts"
import { verifyDeviceSignature } from "../_shared/telework-device-signature.ts"

type LogItem = {
  event_time: string
  event_type: string
  info?: Record<string, unknown>
}

type Body = {
  device_id?: string
  logs?: LogItem[]
  event_time?: string
  event_type?: string
  info?: Record<string, unknown>
  timestamp?: string
  signature?: string
  /** 署名モード時は省略可（サーバが logs をペイロードに含めて検証） */
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

  let items: LogItem[] = []
  if (Array.isArray(body.logs) && body.logs.length > 0) {
    items = body.logs.filter(
      (x) =>
        x &&
        typeof x.event_time === "string" &&
        typeof x.event_type === "string",
    )
  } else if (
    typeof body.event_time === "string" &&
    typeof body.event_type === "string"
  ) {
    items = [
      {
        event_time: body.event_time,
        event_type: body.event_type,
        info: body.info,
      },
    ]
  }

  if (items.length === 0) {
    return new Response(JSON.stringify({ error: "missing_logs" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const admin = createServiceClient(supabaseUrl, serviceKey)

  const sig =
    typeof body.signature === "string" && body.signature.length > 0
      ? body.signature
      : ""

  if (sig) {
    const ts =
      typeof body.timestamp === "string" && body.timestamp.length > 0
        ? body.timestamp
        : ""
    if (!ts) {
      return new Response(JSON.stringify({ error: "missing_timestamp_for_signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    const payload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? body.payload
        : { logs: items }
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

  const rows = items.map((it) => ({
    tenant_id: tenantId,
    user_id: userId,
    device_id: deviceId,
    event_time: it.event_time,
    event_type: it.event_type,
    info: it.info ?? null,
  }))

  const { error: insErr } = await admin.from("telework_pc_logs").insert(rows)

  if (insErr) {
    console.error("telework-pc-log-ingest", insErr)
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  await admin
    .from("telework_pc_devices")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", deviceId)
    .eq("tenant_id", tenantId)

  return new Response(
    JSON.stringify({ inserted: rows.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
