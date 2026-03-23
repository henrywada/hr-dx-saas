/**
 * Edge 関数用: Authorization のユーザ JWT から userId / tenantId を解決する。
 * user_metadata.tenant_id が無い場合は employees から補完（service_role）。
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

export type UserTenant = { userId: string; tenantId: string }

export type AuthFailure = { error: string; status: number }

export async function requireUserTenant(
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string,
  authHeader: string | null,
): Promise<UserTenant | AuthFailure> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "unauthorized", status: 401 }
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser()
  if (userErr || !user) {
    return { error: "unauthorized", status: 401 }
  }

  let tenantId: string | null = null
  const meta = user.user_metadata
  if (meta && typeof meta.tenant_id === "string" && meta.tenant_id.length > 0) {
    tenantId = meta.tenant_id
  }

  if (!tenantId) {
    const admin = createClient(supabaseUrl, serviceKey)
    const { data: emp } = await admin
      .from("employees")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle()
    tenantId = emp?.tenant_id ?? null
  }

  if (!tenantId) {
    return { error: "tenant_unknown", status: 403 }
  }

  return { userId: user.id, tenantId }
}

/** service_role クライアント（RLS バイパス・検証後の更新用） */
export function createServiceClient(
  supabaseUrl: string,
  serviceKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, serviceKey)
}
