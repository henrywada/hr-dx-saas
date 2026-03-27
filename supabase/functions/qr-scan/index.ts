/**
 * 従業員用: QR 検証 → ジオフェンス・重複チェック → セッション消費 → qr_session_scans + work_time_records
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { corsHeaders } from "../_shared/cors.ts"
import { haversineDistanceM, verifyQrToken } from "../_shared/qr-crypto.ts"
import { resolveQrSigningSecret } from "../_shared/qr-secret.ts"

type LocationInput = { lat: number; lng: number; accuracy?: number }
type DeviceInput = Record<string, unknown>

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
}

function getJstDateRangeUtc(now = new Date()): { dateStr: string; startIso: string; endIsoExclusive: string } {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const start = new Date(`${dateStr}T00:00:00+09:00`)
  const endIsoExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString()
  return { dateStr, startIso: start.toISOString(), endIsoExclusive }
}

function workTimeFieldSet(v: string | null | undefined): boolean {
  return v != null && String(v).trim() !== ""
}

const QR_PUNCH_DEFAULT_RADIUS_M = 200
const QR_PUNCH_MAX_SUPERVISOR_SLACK_M = 500

/** メタデータに監督者位置が必須。範囲外・精度不良は拒否（セッション未消費で返す想定） */
function evaluateGeofenceStrict(
  metadata: unknown,
  loc: LocationInput,
): { ok: true } | { ok: false; code: string } {
  if (!isRecord(metadata)) return { ok: false, code: "geofence_not_configured" }
  const slat = metadata.supervisor_lat
  const slng = metadata.supervisor_lng
  if (typeof slat !== "number" || typeof slng !== "number") {
    return { ok: false, code: "geofence_not_configured" }
  }
  const radiusM = typeof metadata.radius_m === "number" ? metadata.radius_m : QR_PUNCH_DEFAULT_RADIUS_M
  const acc = typeof loc.accuracy === "number" ? loc.accuracy : 9999
  if (acc > 150) return { ok: false, code: "location_accuracy_too_low" }
  const supRaw = metadata.supervisor_accuracy_m
  const supAccRaw =
    typeof supRaw === "number" && Number.isFinite(supRaw) ? Math.max(0, supRaw) : 0
  const supSlack = Math.min(supAccRaw, QR_PUNCH_MAX_SUPERVISOR_SLACK_M)
  const d = haversineDistanceM(slat, slng, loc.lat, loc.lng)
  if (d > radiusM + acc + supSlack) return { ok: false, code: "geo_fence_violation" }
  return { ok: true }
}

async function hasDuplicatePunch(
  admin: SupabaseClient,
  employeeId: string,
  employeeUserId: string,
  purpose: string,
  dateStr: string,
  startIso: string,
  endIsoExclusive: string,
): Promise<boolean> {
  const { data: wtr } = await admin
    .from("work_time_records")
    .select("start_time, end_time")
    .eq("employee_id", employeeId)
    .eq("record_date", dateStr)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const w = wtr as { start_time: string | null; end_time: string | null } | null
  const fromWork =
    w != null &&
    (purpose === "punch_in" ? workTimeFieldSet(w.start_time) : workTimeFieldSet(w.end_time))
  if (fromWork) return true

  const { data: scans, error: scanErr } = await admin
    .from("qr_session_scans")
    .select("session_id")
    .eq("employee_user_id", employeeUserId)
    .eq("result", "accepted")
    .gte("scanned_at", startIso)
    .lt("scanned_at", endIsoExclusive)

  if (scanErr) {
    console.error("hasDuplicatePunch scans", scanErr)
    return false
  }
  const sessionIds = [...new Set((scans ?? []).map((r: { session_id: string }) => r.session_id))]
  if (sessionIds.length === 0) return false
  const { data: sessions, error: sesErr } = await admin
    .from("qr_sessions")
    .select("id, purpose")
    .in("id", sessionIds)
  if (sesErr) {
    console.error("hasDuplicatePunch sessions", sesErr)
    return false
  }
  return (sessions ?? []).some((s: { purpose: string }) => s.purpose === purpose)
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
  if (verified.ok === false) {
    return new Response(JSON.stringify({ error: "token_rejected", reason: verified.reason }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  const { payload } = verified
  const purpose = payload.purpose
  if (purpose !== "punch_in" && purpose !== "punch_out") {
    return new Response(JSON.stringify({ error: "invalid_purpose" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

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
    .select("id, tenant_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (empErr || !emp?.tenant_id || !emp.id) {
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
    .select(
      "id, tenant_id, nonce, purpose, expires_at, is_active, uses, max_uses, metadata, supervisor_user_id",
    )
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

  const geo = evaluateGeofenceStrict(session.metadata, loc)
  if (!geo.ok) {
    const status = geo.code === "geo_fence_violation" ? 403 : 400
    return new Response(JSON.stringify({ error: geo.code }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { dateStr, startIso, endIsoExclusive } = getJstDateRangeUtc()
  const dup = await hasDuplicatePunch(
    admin,
    emp.id,
    user.id,
    purpose,
    dateStr,
    startIso,
    endIsoExclusive,
  )
  if (dup) {
    return new Response(JSON.stringify({ error: "duplicate_punch" }), {
      status: 409,
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
      result: "accepted",
      confirm_method: "auto",
      audit: {
        token_exp: payload.exp,
        geofence_passed: true,
        purpose,
      },
    })
    .select("id, result, scanned_at")
    .single()

  if (scanErr || !scan) {
    console.error("qr_session_scans insert", scanErr)
    await admin
      .from("qr_sessions")
      .update({ uses: prevUses, is_active: true })
      .eq("id", session.id)
    return new Response(JSON.stringify({ error: "scan_insert_failed", detail: scanErr?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const punchSupervisorId = session.supervisor_user_id as string
  const nowIso = new Date().toISOString()

  const { data: existingWtr } = await admin
    .from("work_time_records")
    .select("id, start_time, end_time")
    .eq("employee_id", emp.id)
    .eq("record_date", dateStr)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const ex = existingWtr as { id: string; start_time: string | null; end_time: string | null } | null

  let wtrErr: Error | null = null
  if (purpose === "punch_in") {
    if (!ex) {
      const { error } = await admin.from("work_time_records").insert({
        tenant_id: session.tenant_id,
        employee_id: emp.id,
        record_date: dateStr,
        start_time: nowIso,
        end_time: null,
        duration_minutes: 0,
        is_holiday: false,
        source: "qr",
        qr_session_id: session.id,
        punch_supervisor_user_id: punchSupervisorId,
      })
      if (error) wtrErr = error
    } else {
      const { error } = await admin
        .from("work_time_records")
        .update({
          start_time: nowIso,
          source: "qr",
          qr_session_id: session.id,
          punch_supervisor_user_id: punchSupervisorId,
        })
        .eq("id", ex.id)
      if (error) wtrErr = error
    }
  } else {
    if (!ex) {
      const { error } = await admin.from("work_time_records").insert({
        tenant_id: session.tenant_id,
        employee_id: emp.id,
        record_date: dateStr,
        start_time: null,
        end_time: nowIso,
        duration_minutes: 0,
        is_holiday: false,
        source: "qr",
        qr_session_id: session.id,
        punch_supervisor_user_id: punchSupervisorId,
      })
      if (error) wtrErr = error
    } else {
      const startMs = ex.start_time ? new Date(ex.start_time).getTime() : null
      const endMs = new Date(nowIso).getTime()
      let duration = 0
      if (startMs != null) duration = Math.max(0, Math.round((endMs - startMs) / 60_000))
      const { error } = await admin
        .from("work_time_records")
        .update({
          end_time: nowIso,
          duration_minutes: duration,
          source: "qr",
          qr_session_id: session.id,
          punch_supervisor_user_id: punchSupervisorId,
        })
        .eq("id", ex.id)
      if (error) wtrErr = error
    }
  }

  if (wtrErr) {
    console.error("work_time_records upsert", wtrErr)
    await admin.from("qr_session_scans").delete().eq("id", scan.id)
    await admin
      .from("qr_sessions")
      .update({ uses: prevUses, is_active: true })
      .eq("id", session.id)
    return new Response(
      JSON.stringify({ error: "work_time_record_failed", detail: String(wtrErr.message ?? wtrErr) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }

  const { error: auditErr } = await admin.from("qr_audit_logs").insert({
    tenant_id: session.tenant_id,
    related_table: "qr_session_scans",
    related_id: scan.id,
    action: "scan",
    actor_user_id: user.id,
    payload: { session_id: session.id, result: scan.result, purpose },
  })
  if (auditErr) console.error("qr_audit_logs insert", auditErr)

  return new Response(
    JSON.stringify({
      scanId: scan.id,
      result: scan.result,
      scannedAt: scan.scanned_at,
      sessionId: session.id,
      purpose,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
