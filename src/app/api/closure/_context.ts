import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { canAccessHrAttendanceDashboard } from '@/features/attendance/hr-dashboard-access'
import type { Database, Json } from '@/lib/supabase/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type ClosureHrContext =
  | {
      ok: true
      supabase: SupabaseClient<Database>
      tenantId: string
      employeeId: string
      userId: string
    }
  | { ok: false; response: NextResponse }

/**
 * 月次締め API 用: 人事ダッシュボード相当ロール + 従業員紐付け + Supabase セッション
 */
export async function requireClosureHrContext(): Promise<ClosureHrContext> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, response: NextResponse.json({ error: 'ログインが必要です' }, { status: 401 }) }
  }
  if (!canAccessHrAttendanceDashboard(user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'この操作を行う権限がありません（人事ロールが必要です）' }, { status: 403 }),
    }
  }
  if (!user.employee_id) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '従業員マスタに紐付いていないため、監査ログの記録ができません' },
        { status: 403 },
      ),
    }
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !authUser) {
    return { ok: false, response: NextResponse.json({ error: 'セッションが無効です' }, { status: 401 }) }
  }

  return {
    ok: true,
    supabase,
    tenantId: user.tenant_id,
    employeeId: user.employee_id,
    userId: authUser.id,
  }
}

export async function fetchClosureForTenant(
  supabase: SupabaseClient<Database>,
  closureId: string,
  tenantId: string,
) {
  return supabase
    .from('monthly_overtime_closures')
    .select('*')
    .eq('id', closureId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
}

export async function insertClosureAuditLog(
  supabase: SupabaseClient<Database>,
  params: {
    tenantId: string
    closureId: string
    actorId: string
    action: string
    target?: Json | Record<string, unknown> | null
    comment?: string | null
  },
) {
  const targetPayload: Json | null =
    params.target === undefined || params.target === null
      ? null
      : (params.target as Json)

  return supabase.from('closure_audit_logs').insert({
    tenant_id: params.tenantId,
    closure_id: params.closureId,
    actor_id: params.actorId,
    action: params.action,
    target: targetPayload,
    comment: params.comment ?? null,
  })
}

/** YYYY-MM または YYYY-MM-DD をその月の 1 日 (YYYY-MM-DD) に正規化 */
export function normalizeYearMonthToFirstDay(input: string): string | null {
  const t = input.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    return `${t.slice(0, 7)}-01`
  }
  if (/^\d{4}-\d{2}$/.test(t)) {
    return `${t}-01`
  }
  return null
}
