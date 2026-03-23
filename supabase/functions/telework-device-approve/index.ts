/**
 * 人事: 端末承認 / 拒否。承認時は device_secret を発行（暗号化保存）。監査ログ記録。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  createServiceClient,
  requireUserTenant,
} from "../_shared/telework-auth.ts"
import { issueEncryptedDeviceSecret } from "../_shared/telework-device-secret.ts"
import { isHrOrHrManager } from "../_shared/telework-hr.ts"

type Body = {
  device_id?: string
  approve?: boolean
  rejection_reason?: string
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

  const admin = createServiceClient(supabaseUrl, serviceKey)
  const hrOk = await isHrOrHrManager(admin, userId, tenantId)
  if (!hrOk) {
    return new Response(JSON.stringify({ error: "forbidden_not_hr" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

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

  const approve = body.approve === true

  const { data: device, error: devErr } = await admin
    .from("telework_pc_devices")
    .select(
      "id, tenant_id, approved, device_secret, secret_issued_at, rejected_at",
    )
    .eq("id", deviceId)
    .maybeSingle()

  if (devErr || !device) {
    return new Response(JSON.stringify({ error: "device_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const d = device as {
    tenant_id: string
    approved: boolean | null
    device_secret: string | null
    secret_issued_at: string | null
    rejected_at: string | null
  }

  if (d.tenant_id !== tenantId) {
    return new Response(JSON.stringify({ error: "tenant_mismatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (approve) {
    if (d.approved && d.device_secret && d.secret_issued_at) {
      return new Response(JSON.stringify({ error: "already_approved" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const issued = await issueEncryptedDeviceSecret(admin, {
      deviceId,
      tenantId,
      approvedByUserId: userId,
    })

    if (!issued.ok) {
      return new Response(JSON.stringify({ error: issued.error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    await admin.from("telework_audit_logs").insert({
      tenant_id: tenantId,
      actor_user_id: userId,
      action: "telework_device_approved",
      related_table: "telework_pc_devices",
      related_id: deviceId,
      payload: { issued_secret: true },
    })

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const reason =
    typeof body.rejection_reason === "string" ? body.rejection_reason.trim() : null

  const { error: updErr } = await admin
    .from("telework_pc_devices")
    .update({
      approved: false,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", deviceId)
    .eq("tenant_id", tenantId)

  if (updErr) {
    console.error("telework-device-approve reject", updErr)
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  await admin.from("telework_audit_logs").insert({
    tenant_id: tenantId,
    actor_user_id: userId,
    action: "telework_device_rejected",
    related_table: "telework_pc_devices",
    related_id: deviceId,
    payload: { rejection_reason: reason },
  })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
