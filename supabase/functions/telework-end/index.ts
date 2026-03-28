/**
 * テレワーク作業終了: open セッションを検証し end_at・summary・worked_seconds を保存。
 * worked_seconds は telework_pc_logs（heartbeat/activity/unlock 連鎖）から算出。0 のときは壁時計のセッション長。
 * 終了後、勤怠原始データ work_time_records へ upsert（同日複数セッションは分数加算）。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { corsHeaders } from "../_shared/cors.ts"
import {
  earlierIso,
  jstDateYmdFromIso,
  laterIso,
  periodMonthFirstDay,
} from "../_shared/jst-date.ts"
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

/** telework_sessions 更新成功後に勤怠行へ反映。失敗時はログのみ（セッションは既に閉じ済み） */
async function syncWorkTimeRecord(params: {
  admin: SupabaseClient
  tenantId: string
  userId: string
  sessionStartAt: string
  endAt: string
  workedSeconds: number
}): Promise<{ ok: true } | { ok: false; detail: string }> {
  const { admin, tenantId, userId, sessionStartAt, endAt, workedSeconds } = params

  const { data: emp, error: empErr } = await admin
    .from("employees")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle()

  if (empErr) {
    console.error("telework-end employees lookup", empErr)
    return { ok: false, detail: empErr.message ?? "employee_lookup_failed" }
  }
  if (!emp?.id) {
    console.warn("telework-end: no employees row for user, skip work_time_records")
    return { ok: true }
  }

  const employeeId = emp.id as string
  const recordDate = jstDateYmdFromIso(sessionStartAt)
  const newMinutes = Math.max(0, Math.round(workedSeconds / 60))

  const { data: existingList, error: selErr } = await admin
    .from("work_time_records")
    .select("id, start_time, end_time, duration_minutes, source")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("record_date", recordDate)
    .limit(1)

  if (selErr) {
    console.error("telework-end work_time_records select", selErr)
    return { ok: false, detail: selErr.message ?? "wtr_select_failed" }
  }

  const existing = (existingList as {
    id: string
    start_time: string | null
    end_time: string | null
    duration_minutes: number | null
    source: string | null
  }[] | null)?.[0]

  const periodMonth = periodMonthFirstDay(recordDate)

  if (existing) {
    const prevDur = existing.duration_minutes ?? 0
    const mergedSource =
      existing.source === "telework" || !existing.source
        ? "telework"
        : "mixed"
    const { error: upErr } = await admin
      .from("work_time_records")
      .update({
        start_time: earlierIso(existing.start_time, sessionStartAt),
        end_time: laterIso(existing.end_time, endAt),
        duration_minutes: prevDur + newMinutes,
        source: mergedSource,
      })
      .eq("id", existing.id)

    if (upErr) {
      console.error("telework-end work_time_records update", upErr)
      return { ok: false, detail: upErr.message ?? "wtr_update_failed" }
    }
  } else {
    const { error: insErr } = await admin.from("work_time_records").insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      record_date: recordDate,
      start_time: sessionStartAt,
      end_time: endAt,
      duration_minutes: newMinutes,
      is_holiday: false,
      source: "telework",
      qr_session_id: null,
      punch_supervisor_user_id: null,
    })

    if (insErr) {
      console.error("telework-end work_time_records insert", insErr)
      return { ok: false, detail: insErr.message ?? "wtr_insert_failed" }
    }
  }

  const { error: delErr } = await admin
    .from("overtime_monthly_stats")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .eq("period_month", periodMonth)

  if (delErr) {
    console.error("telework-end overtime_monthly_stats delete", delErr)
    return { ok: false, detail: delErr.message ?? "stats_delete_failed" }
  }

  return { ok: true }
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

  const sync = await syncWorkTimeRecord({
    admin,
    tenantId,
    userId,
    sessionStartAt: session.start_at as string,
    endAt,
    workedSeconds,
  })

  const payload: Record<string, unknown> = { worked_seconds: workedSeconds }
  if (!sync.ok) {
    payload.work_time_record_sync_failed = true
    payload.work_time_record_sync_detail = sync.detail
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
