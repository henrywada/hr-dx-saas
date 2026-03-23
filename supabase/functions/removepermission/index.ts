/**
 * POST JSON: { id? , supervisor_user_id?, employee_user_id? }
 * id または (supervisor + employee) で対象を特定し can_display=false（ソフト削除）+ audit revoke
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

  let body: { id?: string; supervisor_user_id?: string; employee_user_id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, errors: ["invalid_json"] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let supervisorId: string | null = null
  let employeeId: string | null = null

  if (body.id?.trim()) {
    const { data: row, error: qErr } = await ctx.service
      .from("supervisor_qr_permissions")
      .select("supervisor_user_id, employee_user_id, tenant_id")
      .eq("id", body.id.trim())
      .maybeSingle()

    if (qErr || !row || row.tenant_id !== ctx.tenantId) {
      return new Response(JSON.stringify({ success: false, errors: ["not_found"] }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (row.supervisor_user_id !== ctx.userId) {
      return new Response(JSON.stringify({ success: false, errors: ["forbidden"] }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    supervisorId = row.supervisor_user_id
    employeeId = row.employee_user_id
  } else {
    supervisorId = body.supervisor_user_id?.trim() ?? null
    employeeId = body.employee_user_id?.trim() ?? null
    if (!supervisorId || !employeeId) {
      return new Response(JSON.stringify({ success: false, errors: ["missing_lookup_keys"] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (supervisorId !== ctx.userId) {
      return new Response(JSON.stringify({ success: false, errors: ["forbidden_supervisor_mismatch"] }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
  }

  const emp = employeeId as string

  const { data, error } = await ctx.service.rpc("fn_supervisor_qr_permission_apply", {
    p_tenant_id: ctx.tenantId,
    p_supervisor_user_id: supervisorId,
    p_employee_user_id: emp,
    p_can_display: false,
    p_scope: null,
    p_actor_user_id: ctx.userId,
    p_audit_action: "revoke",
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
