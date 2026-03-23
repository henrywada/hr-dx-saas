/**
 * 運用用: service_role のみ呼び出し可。通常は telework-device-approve 経由で secret 発行。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import { createServiceClient } from "../_shared/telework-auth.ts"
import { issueEncryptedDeviceSecret } from "../_shared/telework-device-secret.ts"

type Body = {
  device_id?: string
  tenant_id?: string
  approved_by_user_id?: string
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

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "service_role_only" }), {
      status: 401,
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
  const tenantId = typeof body.tenant_id === "string" ? body.tenant_id : ""
  const approver =
    typeof body.approved_by_user_id === "string" ? body.approved_by_user_id : ""
  if (!deviceId || !tenantId || !approver) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const admin = createServiceClient(supabaseUrl, serviceKey)
  const issued = await issueEncryptedDeviceSecret(admin, {
    deviceId,
    tenantId,
    approvedByUserId: approver,
  })

  if (!issued.ok) {
    return new Response(JSON.stringify({ error: issued.error }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({
      device_id: deviceId,
      device_secret: issued.deviceSecretPlain,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
