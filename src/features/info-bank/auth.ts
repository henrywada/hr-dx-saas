import type { SupabaseClient } from '@supabase/supabase-js'

import { getServerUser } from '@/lib/auth/server-user'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import type { Database } from '@/lib/supabase/types'

export type AdminContext =
  | { ok: true; tenantId: string; userId: string; supabase: SupabaseClient<Database> }
  | { ok: false; error: string }

/**
 * 資料管理の操作者を検証する（テナント管理者 = app_role が employee 以外）。
 * 書き込み・Storage 操作は service_role で行うため、tenant_id は必ずここで検証した値を使うこと。
 */
export async function requireInfoBankAdmin(): Promise<AdminContext> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.id) return { ok: false, error: 'ログイン情報が無効です' }
  if (!user.appRole || user.appRole === 'employee') {
    return { ok: false, error: '資料の管理はテナント管理者のみ行えます' }
  }
  try {
    return {
      ok: true,
      tenantId: user.tenant_id,
      userId: user.id,
      supabase: createAdminServiceClient(),
    }
  } catch (e) {
    console.error('[info-bank] service client', e instanceof Error ? e.message : e)
    return {
      ok: false,
      error: 'サーバー設定が不足しています（SUPABASE_SERVICE_ROLE_KEY）。管理者に確認してください',
    }
  }
}
