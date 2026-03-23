/**
 * 人事向け: 従業員番号キーで supervisor_qr_permissions を CSV 一括 upsert
 * multipart/form-data（file）または JSON { csv_base64 }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import { corsHeaders } from "../_shared/cors.ts"
import { splitCsvLine } from "../_shared/csv-line.ts"
import { resolveActorContext } from "../_shared/qr-admin-context.ts"

const HEADERS = [
  "supervisor_employee_number",
  "employee_number",
  "can_display",
  "scope",
] as const

type ParsedRow = {
  line: number
  supervisor_employee_number: string
  employee_number: string
  can_display: boolean
  scope: string
}

function normalizeEmployeeNo(raw: string): string {
  return raw.trim()
}

function parseCsv(text: string): { ok: true; rows: ParsedRow[] } | { ok: false; reason: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length < 2) return { ok: false, reason: "empty_csv" }

  const header = splitCsvLine(lines[0]).map((c) => c.trim().toLowerCase())
  if (
    header.length < HEADERS.length ||
    !HEADERS.every((h, i) => header[i] === h)
  ) {
    return { ok: false, reason: "bad_header" }
  }

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1
    const parts = splitCsvLine(lines[i]).map((p) => p.trim())
    if (parts.length < 2) {
      return { ok: false, reason: `line_${lineNo}_columns` }
    }
    const supNo = normalizeEmployeeNo(parts[0])
    const empNo = normalizeEmployeeNo(parts[1])
    if (!supNo || !empNo) {
      return { ok: false, reason: `line_${lineNo}_empty_number` }
    }

    const canRaw = (parts[2] ?? "").trim()
    let can_display = true
    if (canRaw !== "") {
      if (canRaw !== "0" && canRaw !== "1") {
        return { ok: false, reason: `line_${lineNo}_can_display` }
      }
      can_display = canRaw === "1"
    }

    const scope = (parts[3] ?? "").trim() === "" ? "qr_display" : parts[3].trim()

    rows.push({
      line: lineNo,
      supervisor_employee_number: supNo,
      employee_number: empNo,
      can_display,
      scope,
    })
  }
  return { ok: true, rows }
}

type ResolveOk = { ok: true; userId: string }
type ResolveFail = {
  ok: false
  reason: "supervisor not found" | "employee not found" | "tenant mismatch"
}

async function resolveEmployeeUserId(
  service: SupabaseClient,
  tenantId: string,
  employeeNo: string,
  kind: "supervisor" | "employee",
): Promise<ResolveOk | ResolveFail> {
  const { data: inTenant, error: e1 } = await service
    .from("employees")
    .select("user_id, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("employee_no", employeeNo)
    .limit(2)

  if (e1) {
    console.error("resolveEmployeeUserId in-tenant", e1)
    return {
      ok: false,
      reason: kind === "supervisor" ? "supervisor not found" : "employee not found",
    }
  }
  const inRows = inTenant ?? []
  if (inRows.length > 1) {
    return {
      ok: false,
      reason: kind === "supervisor" ? "supervisor not found" : "employee not found",
    }
  }
  if (inRows.length === 1) {
    const uid = inRows[0].user_id
    if (!uid) {
      return {
        ok: false,
        reason: kind === "supervisor" ? "supervisor not found" : "employee not found",
      }
    }
    return { ok: true, userId: uid }
  }

  const { data: other, error: e2 } = await service
    .from("employees")
    .select("tenant_id")
    .eq("employee_no", employeeNo)
    .limit(1)

  if (e2) {
    console.error("resolveEmployeeUserId cross-tenant", e2)
    return {
      ok: false,
      reason: kind === "supervisor" ? "supervisor not found" : "employee not found",
    }
  }
  if (other && other.length > 0) {
    return { ok: false, reason: "tenant mismatch" }
  }
  return {
    ok: false,
    reason: kind === "supervisor" ? "supervisor not found" : "employee not found",
  }
}

async function assertHrOrHrManager(
  service: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const { data: emp, error } = await service
    .from("employees")
    .select("app_role_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (error || !emp?.app_role_id) return false

  const { data: role, error: rErr } = await service
    .from("app_role")
    .select("app_role")
    .eq("id", emp.app_role_id)
    .maybeSingle()

  if (rErr || !role?.app_role) return false
  return role.app_role === "hr" || role.app_role === "hr_manager"
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        summary: { total: 0, success: 0, failed: 0 },
        details: [],
        error: "method_not_allowed",
      }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(
      JSON.stringify({
        summary: { total: 0, success: 0, failed: 0 },
        details: [],
        error: "server_misconfigured",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const ctx = await resolveActorContext(supabaseUrl, anonKey, serviceKey, req.headers.get("Authorization"))
  if (!ctx.ok) {
    return new Response(JSON.stringify({ summary: { total: 0, success: 0, failed: 0 }, details: [], ...ctx.json }), {
      status: ctx.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const isHr = await assertHrOrHrManager(ctx.service, ctx.userId, ctx.tenantId)
  if (!isHr) {
    return new Response(
      JSON.stringify({
        summary: { total: 0, success: 0, failed: 0 },
        details: [],
        error: "forbidden_requires_hr_or_hr_manager",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  let text = ""
  const ct = req.headers.get("Content-Type") ?? ""

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({
          summary: { total: 0, success: 0, failed: 0 },
          details: [],
          error: "missing_file",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
    text = await file.text()
  } else {
    let json: { csv_base64?: string }
    try {
      json = await req.json()
    } catch {
      return new Response(
        JSON.stringify({
          summary: { total: 0, success: 0, failed: 0 },
          details: [],
          error: "invalid_json",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
    if (!json.csv_base64) {
      return new Response(
        JSON.stringify({
          summary: { total: 0, success: 0, failed: 0 },
          details: [],
          error: "expected_multipart_or_csv_base64",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
    try {
      text = new TextDecoder().decode(
        Uint8Array.from(
          atob(json.csv_base64.replace(/^data:[^;]+;base64,/, "")),
          (c) => c.charCodeAt(0),
        ),
      )
    } catch {
      return new Response(
        JSON.stringify({
          summary: { total: 0, success: 0, failed: 0 },
          details: [],
          error: "invalid_base64",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
  }

  const parsed = parseCsv(text)
  if (!parsed.ok) {
    return new Response(
      JSON.stringify({
        summary: { total: 0, success: 0, failed: 0 },
        details: [],
        error: parsed.reason,
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const details: Array<{
    line: number
    supervisor_employee_number: string
    employee_number: string
    result: "ok" | "error"
    reason?: string
  }> = []

  let success = 0
  let failed = 0

  for (const r of parsed.rows) {
    const supRes = await resolveEmployeeUserId(
      ctx.service,
      ctx.tenantId,
      r.supervisor_employee_number,
      "supervisor",
    )
    if (!supRes.ok) {
      failed++
      details.push({
        line: r.line,
        supervisor_employee_number: r.supervisor_employee_number,
        employee_number: r.employee_number,
        result: "error",
        reason: supRes.reason,
      })
      await ctx.service.from("qr_audit_logs").insert({
        tenant_id: ctx.tenantId,
        related_table: "supervisor_qr_permissions",
        related_id: null,
        action: "bulk_grant_failed",
        actor_user_id: ctx.userId,
        payload: {
          line: r.line,
          supervisor_employee_number: r.supervisor_employee_number,
          employee_number: r.employee_number,
          reason: supRes.reason,
        },
      })
      continue
    }

    const empRes = await resolveEmployeeUserId(
      ctx.service,
      ctx.tenantId,
      r.employee_number,
      "employee",
    )
    if (!empRes.ok) {
      failed++
      details.push({
        line: r.line,
        supervisor_employee_number: r.supervisor_employee_number,
        employee_number: r.employee_number,
        result: "error",
        reason: empRes.reason,
      })
      await ctx.service.from("qr_audit_logs").insert({
        tenant_id: ctx.tenantId,
        related_table: "supervisor_qr_permissions",
        related_id: null,
        action: "bulk_grant_failed",
        actor_user_id: ctx.userId,
        payload: {
          line: r.line,
          supervisor_employee_number: r.supervisor_employee_number,
          employee_number: r.employee_number,
          reason: empRes.reason,
        },
      })
      continue
    }

    const { error: rpcErr } = await ctx.service.rpc("fn_supervisor_qr_permission_bulk_import_apply", {
      p_tenant_id: ctx.tenantId,
      p_supervisor_user_id: supRes.userId,
      p_employee_user_id: empRes.userId,
      p_can_display: r.can_display,
      p_scope: r.scope,
      p_actor_user_id: ctx.userId,
    })

    if (rpcErr) {
      failed++
      const reason = rpcErr.message || "rpc_error"
      details.push({
        line: r.line,
        supervisor_employee_number: r.supervisor_employee_number,
        employee_number: r.employee_number,
        result: "error",
        reason,
      })
      await ctx.service.from("qr_audit_logs").insert({
        tenant_id: ctx.tenantId,
        related_table: "supervisor_qr_permissions",
        related_id: null,
        action: "bulk_grant_failed",
        actor_user_id: ctx.userId,
        payload: {
          line: r.line,
          supervisor_employee_number: r.supervisor_employee_number,
          employee_number: r.employee_number,
          reason,
        },
      })
      continue
    }

    success++
    details.push({
      line: r.line,
      supervisor_employee_number: r.supervisor_employee_number,
      employee_number: r.employee_number,
      result: "ok",
    })
  }

  const total = parsed.rows.length
  console.log(
    JSON.stringify({
      fn: "qr-admin-bulkimportpermissions",
      summary: { total, success, failed },
    }),
  )

  return new Response(
    JSON.stringify({
      summary: { total, success, failed },
      details,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
