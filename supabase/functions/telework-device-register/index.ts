/**
 * 端末登録: JWT ユーザと employee_number（employees.employee_no）一致を確認し pending で登録
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  createServiceClient,
  requireUserTenant,
} from "../_shared/telework-auth.ts"

type Body = {
  device_identifier?: string
  device_name?: string
  employee_number?: string
}

async function sha256HexUtf8(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  )
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function randomTokenHex(): string {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("")
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

  const deviceIdentifier =
    typeof body.device_identifier === "string" ? body.device_identifier.trim() : ""
  const deviceName =
    typeof body.device_name === "string" ? body.device_name.trim() : ""
  const employeeNumber =
    typeof body.employee_number === "string" ? body.employee_number.trim() : ""

  if (!deviceIdentifier || !deviceName || !employeeNumber) {
    return new Response(
      JSON.stringify({ error: "missing_device_identifier_name_or_employee_number" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const admin = createServiceClient(supabaseUrl, serviceKey)

  const { data: emp, error: empErr } = await admin
    .from("employees")
    .select("id, user_id, tenant_id, employee_no")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (empErr || !emp) {
    return new Response(JSON.stringify({ error: "employee_not_found" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const empNo = (emp as { employee_no?: string | null }).employee_no?.trim() ?? ""
  if (!empNo || empNo !== employeeNumber) {
    return new Response(JSON.stringify({ error: "employee_number_mismatch" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: dup } = await admin
    .from("telework_pc_devices")
    .select("id, approved")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("device_identifier", deviceIdentifier)
    .is("rejected_at", null)
    .maybeSingle()

  if (dup?.id) {
    const d = dup as { approved?: boolean | null }
    if (d.approved) {
      return new Response(JSON.stringify({ error: "device_already_registered" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    return new Response(JSON.stringify({ error: "registration_already_pending" }), {
      status: 409,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const registrationToken = randomTokenHex()
  const registrationTokenHash = await sha256HexUtf8(registrationToken)

  const { data: inserted, error: insErr } = await admin
    .from("telework_pc_devices")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      device_name: deviceName,
      device_identifier: deviceIdentifier,
      approved: false,
      registration_token_hash: registrationTokenHash,
      rejected_at: null,
      rejection_reason: null,
    })
    .select("id")
    .single()

  if (insErr || !inserted) {
    console.error("telework-device-register insert", insErr)
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({
      device_id: inserted.id,
      registration_token: registrationToken,
      status: "pending_approval",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
