/**
 * テレワーク作業終了: open セッションを検証し end_at・summary・worked_seconds を保存。
 * worked_seconds は telework_pc_logs（heartbeat/activity/unlock 連鎖）から算出。0 のときは壁時計のセッション長。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  createServiceClient,
  requireUserTenant,
} from "../_shared/telework-auth.ts"
import {
  computeWorkedSecondsFromLogs,
  resolveWorkedSeconds,
} from "../_shared/telework-worked-seconds.ts"

type Body = {
  session_id?: string
  summary_text?: string
  timestamp?: string
  lat?: number
  lon?: number
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

  const sessionId =
    typeof body.session_id === "string" ? body.session_id : ""
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "missing_session_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const summaryText =
    typeof body.summary_text === "string" ? body.summary_text : ""
  const endAt =
    typeof body.timestamp === "string" && body.timestamp.length > 0
      ? body.timestamp
      : new Date().toISOString()

  const admin = createServiceClient(supabaseUrl, serviceKey)

  const { data: session, error: sesErr } = await admin
    .from("telework_sessions")
    .select(
      "id, tenant_id, user_id, device_id, status, start_at, end_at",
    )
    .eq("id", sessionId)
    .maybeSingle()

  if (sesErr || !session) {
    return new Response(JSON.stringify({ error: "session_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (session.tenant_id !== tenantId) {
    return new Response(JSON.stringify({ error: "tenant_mismatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (session.user_id !== userId) {
    return new Response(JSON.stringify({ error: "user_mismatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (session.status !== "open" || session.end_at !== null) {
    return new Response(JSON.stringify({ error: "session_not_open" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (!session.device_id) {
    return new Response(JSON.stringify({ error: "session_missing_device" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const startMs = new Date(session.start_at).getTime()
  const endMs = new Date(endAt).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return new Response(JSON.stringify({ error: "invalid_time_range" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: logs, error: logErr } = await admin
    .from("telework_pc_logs")
    .select("event_time, event_type")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("device_id", session.device_id)
    .gte("event_time", session.start_at)
    .lte("event_time", endAt)
    .order("event_time", { ascending: true })

  if (logErr) {
    console.error("telework-end logs", logErr)
    return new Response(JSON.stringify({ error: "logs_fetch_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const fromLogs = computeWorkedSecondsFromLogs(logs ?? [], startMs, endMs)
  const workedSeconds = resolveWorkedSeconds(fromLogs, startMs, endMs)

  const xf = req.headers.get("x-forwarded-for")
  const endIp = xf?.split(",")[0]?.trim() ?? null

  const { error: updErr } = await admin
    .from("telework_sessions")
    .update({
      end_at: endAt,
      end_lat: typeof body.lat === "number" ? body.lat : null,
      end_lon: typeof body.lon === "number" ? body.lon : null,
      end_ip: endIp,
      end_user_agent: req.headers.get("user-agent"),
      worked_seconds: workedSeconds,
      summary_text: summaryText.length > 0 ? summaryText : null,
      status: "closed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)

  if (updErr) {
    console.error("telework-end update", updErr)
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({ worked_seconds: workedSeconds }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
