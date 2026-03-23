/**
 * Auth Admin に getUserByEmail が無いため、listUsers をページングしてメール一致ユーザーを探す
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

export async function resolveAuthUserIdByEmail(
  service: SupabaseClient,
  email: string,
): Promise<{ userId: string | null; error?: string }> {
  const target = email.trim().toLowerCase()
  if (!target.includes("@")) return { userId: null }

  let page = 1
  const perPage = 200
  const maxPages = 100

  while (page <= maxPages) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage })
    if (error) return { userId: null, error: error.message }
    const users = data?.users ?? []
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target)
    if (hit?.id) return { userId: hit.id }
    if (users.length < perPage) return { userId: null }
    page++
  }

  return { userId: null, error: "email_lookup_exhausted" }
}
