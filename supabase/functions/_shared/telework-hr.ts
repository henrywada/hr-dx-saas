/**
 * 人事ロール（hr / hr_manager）か service_role 経由で検証
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

export async function isHrOrHrManager(
  admin: SupabaseClient,
  userId: string,
  tenantId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("employees")
    .select("app_role:app_role_id(app_role)")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (error || !data) return false
  const role = (data as { app_role?: { app_role?: string } | null }).app_role
    ?.app_role
  return role === "hr" || role === "hr_manager"
}
