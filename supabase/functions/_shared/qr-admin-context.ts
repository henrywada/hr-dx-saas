/**
 * QR 管理系 Edge Function 共通: JWT でユーザーを解決し、employees から tenant_id を取得する
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

export type ActorContext =
  | {
    ok: true
    userId: string
    tenantId: string
    email: string | null
    service: SupabaseClient
  }
  | { ok: false; status: number; json: Record<string, unknown> }

export async function resolveActorContext(
  supabaseUrl: string,
  anonKey: string,
  serviceKey: string,
  authHeader: string | null,
): Promise<ActorContext> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, json: { success: false, errors: ["missing_bearer"] } }
  }

  // セッションストレージが無い Edge 上では getUser() 単体では JWT が渡らず Invalid JWT になるため、
  // Authorization の access_token を明示的に渡す（GoTrue GET /user で検証）
  const accessToken = authHeader.slice(7).trim()
  if (!accessToken) {
    return { ok: false, status: 401, json: { success: false, errors: ["empty_bearer"] } }
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: userData, error: userErr } = await userClient.auth.getUser(accessToken)
  if (userErr || !userData?.user?.id) {
    const msg = userErr?.message ?? "invalid_session"
    return { ok: false, status: 401, json: { success: false, errors: [msg] } }
  }

  const userId = userData.user.id
  const email = userData.user.email ?? null

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })

  const { data: emp, error: empErr } = await service
    .from("employees")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (empErr || !emp?.tenant_id) {
    return { ok: false, status: 403, json: { success: false, errors: ["tenant_not_found_for_user"] } }
  }

  return {
    ok: true,
    userId,
    tenantId: emp.tenant_id as string,
    email,
    service,
  }
}
