/**
 * POST JSON: { supervisor_user_id?, employee_user_id?, page?, per_page?, search? }
 * テナント内の一覧（ページング）。RLS の SELECT と同様にテナント境界のみ。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { resolveAuthUserIdByEmail } from "../_shared/auth-resolve-email.ts"
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
    page?: number
    per_page?: number
    search?: string
    /** true / false で can_display を絞り込み。未指定はすべて */
    can_display?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ success: false, errors: ["invalid_json"] }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const page = Math.max(1, Number(body.page) || 1)
  const perPage = Math.min(100, Math.max(1, Number(body.per_page) || 20))
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const search = (body.search ?? "").trim()
  let userIdFilter: string[] | null = null

  if (search.length > 0) {
    const ids = new Set<string>()
    const esc = search.replace(/%/g, "\\%").replace(/_/g, "\\_")
    const likePat = `%${esc}%`

    const { data: empsName } = await ctx.service
      .from("employees")
      .select("user_id")
      .eq("tenant_id", ctx.tenantId)
      .not("user_id", "is", null)
      .ilike("name", likePat)

    const { data: empsNo } = await ctx.service
      .from("employees")
      .select("user_id")
      .eq("tenant_id", ctx.tenantId)
      .not("user_id", "is", null)
      .ilike("employee_no", likePat)

    for (const e of [...(empsName ?? []), ...(empsNo ?? [])]) {
      if (e.user_id) ids.add(e.user_id as string)
    }

    if (search.includes("@")) {
      const { userId } = await resolveAuthUserIdByEmail(ctx.service, search.toLowerCase())
      if (userId) ids.add(userId)
    }

    userIdFilter = [...ids]
    if (userIdFilter.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          records: [],
          page,
          per_page: perPage,
          total: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }
  }

  let q = ctx.service
    .from("supervisor_qr_permissions")
    .select("*", { count: "exact" })
    .eq("tenant_id", ctx.tenantId)

  if (body.supervisor_user_id?.trim()) {
    q = q.eq("supervisor_user_id", body.supervisor_user_id.trim())
  }
  if (body.employee_user_id?.trim()) {
    q = q.eq("employee_user_id", body.employee_user_id.trim())
  }
  if (typeof body.can_display === "boolean") {
    q = q.eq("can_display", body.can_display)
  }
  if (userIdFilter && userIdFilter.length > 0) {
    const ins = userIdFilter.join(",")
    q = q.or(`supervisor_user_id.in.(${ins}),employee_user_id.in.(${ins})`)
  }

  q = q.order("updated_at", { ascending: false }).range(from, to)

  const { data: records, error, count } = await q

  if (error) {
    return new Response(
      JSON.stringify({ success: false, errors: [error.message] }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  return new Response(
    JSON.stringify({
      success: true,
      records: records ?? [],
      page,
      per_page: perPage,
      total: count ?? 0,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
