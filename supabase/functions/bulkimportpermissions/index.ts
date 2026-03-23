/**
 * multipart/form-data（file）または POST JSON:
 * - { csv_base64: string }
 * - { rows: { supervisor_user_id, employee_user_id, can_display }[] }  // 一覧からの一括更新用
 *
 * CSV 列: supervisor_email, employee_email, can_display (1/0)
 * 各行の supervisor_email は呼び出しユーザーのメールと一致必須
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { resolveAuthUserIdByEmail } from "../_shared/auth-resolve-email.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { resolveActorContext } from "../_shared/qr-admin-context.ts"

const HEADERS = ["supervisor_email", "employee_email", "can_display"] as const

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQ = !inQ
      }
      continue
    }
    if (c === "," && !inQ) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += c
  }
  out.push(cur)
  return out
}

function parseCsv(text: string): { ok: true; rows: { line: number; sup: string; emp: string; can: boolean }[] } | {
  ok: false
  reason: string
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
  if (lines.length < 2) return { ok: false, reason: "empty_csv" }
  const header = lines[0].split(",").map((c) => c.trim().toLowerCase())
  if (header.length < 3 || HEADERS.some((h, i) => header[i] !== h)) {
    return { ok: false, reason: "bad_header" }
  }
  const rows: { line: number; sup: string; emp: string; can: boolean }[] = []
  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1
    const parts = splitCsvLine(lines[i])
    if (parts.length < 3) return { ok: false, reason: `line_${lineNo}_columns` }
    const sup = parts[0].trim().toLowerCase()
    const emp = parts[1].trim().toLowerCase()
    const f = parts[2].trim()
    if (!sup.includes("@") || !emp.includes("@")) return { ok: false, reason: `line_${lineNo}_email` }
    if (f !== "0" && f !== "1") return { ok: false, reason: `line_${lineNo}_can_display` }
    rows.push({ line: lineNo, sup, emp, can: f === "1" })
  }
  return { ok: true, rows }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, summary: { total: 0, success: 0, failed: 0 }, failures: [] }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(
      JSON.stringify({
        success: false,
        summary: { total: 0, success: 0, failed: 0 },
        failures: [{ line: 0, reason: "server_misconfigured" }],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const ctx = await resolveActorContext(supabaseUrl, anonKey, serviceKey, req.headers.get("Authorization"))
  if (!ctx.ok) {
    return new Response(JSON.stringify({ success: false, ...ctx.json }), {
      status: ctx.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const actorEmail = (ctx.email ?? "").toLowerCase()
  if (!actorEmail) {
    return new Response(
      JSON.stringify({
        success: false,
        summary: { total: 0, success: 0, failed: 0 },
        failures: [{ line: 0, reason: "caller_has_no_email" }],
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  type RowIn = { line: number; supervisor_user_id: string; employee_user_id: string; can_display: boolean }
  let logicalRows: RowIn[] = []
  const failures: { line: number; reason: string }[] = []
  let totalDeclared = 0

  const ct = req.headers.get("Content-Type") ?? ""

  if (ct.includes("multipart/form-data")) {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({
          success: false,
          summary: { total: 0, success: 0, failed: 0 },
          failures: [{ line: 0, reason: "missing_file" }],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
    const text = await file.text()
    const parsed = parseCsv(text)
    if (!parsed.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          summary: { total: 0, success: 0, failed: 0 },
          failures: [{ line: 0, reason: parsed.reason }],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
    totalDeclared = parsed.rows.length
    for (const r of parsed.rows) {
      if (r.sup !== actorEmail) {
        failures.push({ line: r.line, reason: "supervisor_email_must_match_caller" })
        continue
      }
      const supRes = await resolveAuthUserIdByEmail(ctx.service, r.sup)
      const empRes = await resolveAuthUserIdByEmail(ctx.service, r.emp)
      if (supRes.error || !supRes.userId) {
        failures.push({ line: r.line, reason: "supervisor_user_not_found" })
        continue
      }
      if (empRes.error || !empRes.userId) {
        failures.push({ line: r.line, reason: "employee_user_not_found" })
        continue
      }
      logicalRows.push({
        line: r.line,
        supervisor_user_id: supRes.userId,
        employee_user_id: empRes.userId,
        can_display: r.can,
      })
    }
  } else {
    let json: {
      csv_base64?: string
      rows?: { supervisor_user_id: string; employee_user_id: string; can_display: boolean }[]
    }
    try {
      json = await req.json()
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          summary: { total: 0, success: 0, failed: 0 },
          failures: [{ line: 0, reason: "invalid_json" }],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    if (json.rows && Array.isArray(json.rows)) {
      totalDeclared = json.rows.length
      logicalRows = json.rows.map((r, i) => ({
        line: i + 1,
        supervisor_user_id: r.supervisor_user_id,
        employee_user_id: r.employee_user_id,
        can_display: !!r.can_display,
      }))
    } else if (json.csv_base64) {
      let text: string
      try {
        text = new TextDecoder().decode(
          Uint8Array.from(atob(json.csv_base64.replace(/^data:[^;]+;base64,/, "")), (c) => c.charCodeAt(0)),
        )
      } catch {
        return new Response(
          JSON.stringify({
            success: false,
            summary: { total: 0, success: 0, failed: 0 },
            failures: [{ line: 0, reason: "invalid_base64" }],
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      const parsed = parseCsv(text)
      if (!parsed.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            summary: { total: 0, success: 0, failed: 0 },
            failures: [{ line: 0, reason: parsed.reason }],
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }
      totalDeclared = parsed.rows.length
      for (const r of parsed.rows) {
        if (r.sup !== actorEmail) {
          failures.push({ line: r.line, reason: "supervisor_email_must_match_caller" })
          continue
        }
        const supRes = await resolveAuthUserIdByEmail(ctx.service, r.sup)
        const empRes = await resolveAuthUserIdByEmail(ctx.service, r.emp)
        if (supRes.error || !supRes.userId) {
          failures.push({ line: r.line, reason: "supervisor_user_not_found" })
          continue
        }
        if (empRes.error || !empRes.userId) {
          failures.push({ line: r.line, reason: "employee_user_not_found" })
          continue
        }
        logicalRows.push({
          line: r.line,
          supervisor_user_id: supRes.userId,
          employee_user_id: empRes.userId,
          can_display: r.can,
        })
      }
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          summary: { total: 0, success: 0, failed: 0 },
          failures: [{ line: 0, reason: "expected_csv_base64_or_rows" }],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
  }

  let success = 0

  for (const r of logicalRows) {
    if (r.supervisor_user_id !== ctx.userId) {
      failures.push({ line: r.line, reason: "forbidden_supervisor_mismatch" })
      continue
    }
    const auditAction = r.can_display ? "grant" : "revoke"
    const { error } = await ctx.service.rpc("fn_supervisor_qr_permission_apply", {
      p_tenant_id: ctx.tenantId,
      p_supervisor_user_id: r.supervisor_user_id,
      p_employee_user_id: r.employee_user_id,
      p_can_display: r.can_display,
      p_scope: null,
      p_actor_user_id: ctx.userId,
      p_audit_action: auditAction,
    })
    if (error) {
      failures.push({ line: r.line, reason: error.message })
      continue
    }
    success++
  }

  const failedCount = failures.length
  const total = totalDeclared > 0 ? totalDeclared : logicalRows.length + failedCount

  return new Response(
    JSON.stringify({
      success: failedCount === 0,
      summary: { total, success, failed: failedCount },
      failures,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
