/**
 * 登録端末: 承認後に平文 device_secret を一度だけ取得（registration_token で照合）
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import {
  createServiceClient,
  requireUserTenant,
} from "../_shared/telework-auth.ts"
import { decryptDeviceSecretStored, isEncryptedDeviceSecret } from "../_shared/telework-device-crypto.ts"

type Body = {
  device_id?: string
  registration_token?: string
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

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let x = 0
  for (let i = 0; i < a.length; i++) {
    x |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return x === 0
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

  const deviceId = typeof body.device_id === "string" ? body.device_id : ""
  const token =
    typeof body.registration_token === "string" ? body.registration_token.trim() : ""
  if (!deviceId || !token) {
    return new Response(
      JSON.stringify({ error: "missing_device_id_or_registration_token" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const admin = createServiceClient(supabaseUrl, serviceKey)

  const { data: device, error: devErr } = await admin
    .from("telework_pc_devices")
    .select(
      "id, tenant_id, user_id, registration_token_hash, approved, secret_issued_at, secret_delivered_at, rejected_at, device_secret",
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
    user_id: string
    registration_token_hash: string | null
    approved: boolean | null
    secret_issued_at: string | null
    secret_delivered_at: string | null
    rejected_at: string | null
    device_secret: string | null
  }

  if (d.tenant_id !== tenantId || d.user_id !== userId) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const hash = await sha256HexUtf8(token)
  const storedHash = d.registration_token_hash ?? ""
  if (!storedHash || !timingSafeEqualHex(hash.toLowerCase(), storedHash.toLowerCase())) {
    return new Response(JSON.stringify({ error: "invalid_registration_token" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (d.rejected_at) {
    return new Response(
      JSON.stringify({ status: "rejected" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  if (!d.approved || !d.secret_issued_at) {
    return new Response(
      JSON.stringify({ status: "pending_approval" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  if (d.secret_delivered_at) {
    return new Response(
      JSON.stringify({ status: "already_delivered" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  if (!d.device_secret || !isEncryptedDeviceSecret(d.device_secret)) {
    return new Response(JSON.stringify({ error: "secret_not_ready" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const now = new Date().toISOString()
  const { data: claimed, error: updErr } = await admin
    .from("telework_pc_devices")
    .update({ secret_delivered_at: now })
    .eq("id", deviceId)
    .eq("tenant_id", tenantId)
    .is("secret_delivered_at", null)
    .select("id")
    .maybeSingle()

  if (updErr) {
    console.error("poll mark delivered", updErr)
    return new Response(JSON.stringify({ error: "update_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!claimed?.id) {
    return new Response(
      JSON.stringify({ status: "already_delivered" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  let plain: string
  try {
    plain = await decryptDeviceSecretStored(d.device_secret)
  } catch (e) {
    console.error("poll decrypt", e)
    await admin.from("telework_pc_devices").update({ secret_delivered_at: null }).eq("id", deviceId)
    return new Response(JSON.stringify({ error: "decrypt_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      device_id: deviceId,
      device_secret: plain,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
})
