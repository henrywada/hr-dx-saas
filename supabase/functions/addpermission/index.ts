/**
 * POST JSON: { supervisor_user_id, employee_user_id, can_display?, scope? }
 * 呼び出しユーザーは supervisor_user_id と一致する必要がある（自分の権限のみ管理）
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { resolveActorContext } from "../_shared/qr-admin-context.ts"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, errors: ["method_not_allowed"] }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ success: false, errors: ["server_misconfigured"] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const ctx = await resolveActorContext(supabaseUrl, anonKey, serviceKey, req.headers.get("Authorization"))
  if (!ctx.ok) {
    return new Response(JSON.stringify(ctx.json), {
      status: ctx.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: {
    supervisor_user_id?: string
    employee_user_id?: string
    can_display?: boolean
    scope?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, errors: ["invalid_json"] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supId = body.supervisor_user_id?.trim()
  const empId = body.employee_user_id?.trim()
  if (!supId || !empId) {
    return new Response(JSON.stringify({ success: false, errors: ["missing_ids"] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (supId !== ctx.userId) {
    return new Response(JSON.stringify({ success: false, errors: ["forbidden_supervisor_mismatch"] }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const canDisplay = body.can_display !== false
  const auditAction = canDisplay ? "grant" : "revoke"

  const { data, error } = await ctx.service.rpc("fn_supervisor_qr_permission_apply", {
    p_tenant_id: ctx.tenantId,
    p_supervisor_user_id: supId,
    p_employee_user_id: empId,
    p_can_display: canDisplay,
    p_scope: body.scope ?? null,
    p_actor_user_id: ctx.userId,
    p_audit_action: auditAction,
  })

  if (error) {
    return new Response(
      JSON.stringify({ success: false, errors: [error.message] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  return new Response(JSON.stringify({ success: true, record: data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
