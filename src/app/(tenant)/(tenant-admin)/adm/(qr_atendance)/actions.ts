'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'

export type TenantEmployeeSearchResult = {
  user_id: string
  name: string | null
  employee_no: string | null
}

/**
 * 従業員検索: RLS の影響を受けずに同一テナント内の候補を返す。
 */
export async function searchTenantEmployees(
  tenantId: string,
  rawTerm: string,
  limit = 30,
): Promise<TenantEmployeeSearchResult[]> {
  const me = await getServerUser()
  if (!me?.tenant_id || me.tenant_id !== tenantId) {
    return []
  }

  const term = rawTerm.trim()
  if (!term) return []

  try {
    const admin = createAdminClient()
    const esc = term.replace(/[%_]/g, '\\$&')
    const pat = `%${esc}%`
    const max = Math.min(Math.max(1, limit), 100)

    const base = () =>
      admin
        .from('employees')
        .select('user_id, name, employee_no')
        .eq('tenant_id', tenantId)
        .not('user_id', 'is', null)

    const [{ data: byName }, { data: byNo }] = await Promise.all([
      base().ilike('name', pat).limit(max),
      base().ilike('employee_no', pat).limit(max),
    ])
    const map = new Map<string, TenantEmployeeSearchResult>()
    for (const row of [...(byName ?? []), ...(byNo ?? [])]) {
      if (row.user_id) {
        map.set(row.user_id, {
          user_id: row.user_id,
          name: row.name ?? null,
          employee_no: row.employee_no ?? null,
        })
      }
    }
    return [...map.values()].slice(0, max)
  } catch {
    return []
  }
}

/**
 * 部署名に一致する従業員 user_id を返す（同一テナントのみ）。
 */
export async function searchTenantEmployeeIdsByDivisionName(
  tenantId: string,
  rawTerm: string,
  limit = 200,
): Promise<string[]> {
  const me = await getServerUser()
  if (!me?.tenant_id || me.tenant_id !== tenantId) {
    return []
  }

  const term = rawTerm.trim()
  if (!term) return []

  try {
    const admin = createAdminClient()
    const esc = term.replace(/[%_]/g, '\\$&')
    const pat = `%${esc}%`
    const max = Math.min(Math.max(1, limit), 1000)

    const { data: divs } = await admin
      .from('divisions')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('name', pat)
      .limit(max)
    const divIds = (divs ?? []).map((d) => d.id).filter(Boolean)
    if (divIds.length === 0) return []

    const { data: emps } = await admin
      .from('employees')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .in('division_id', divIds)
      .not('user_id', 'is', null)
      .limit(max)
    return [...new Set((emps ?? []).map((e) => e.user_id).filter(Boolean) as string[])]
  } catch {
    return []
  }
}

/**
 * 権限一覧用: 同一テナントの従業員 user_id に対する auth メール（サーバのみ service_role で取得）
 */
export async function fetchEmployeeEmailsForTenant(
  tenantId: string,
  userIds: string[],
): Promise<Record<string, string>> {
  const me = await getServerUser()
  if (!me?.tenant_id || me.tenant_id !== tenantId || userIds.length === 0) {
    return {}
  }

  try {
    const admin = createAdminClient()
    const { data: emps, error: empErr } = await admin
      .from('employees')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .in('user_id', userIds)

    if (empErr || !emps?.length) {
      return {}
    }

    const allowed = new Set(
      (emps as { user_id: string | null }[]).map((e) => e.user_id).filter(Boolean) as string[],
    )
    const out: Record<string, string> = {}

    await Promise.all(
      [...allowed].map(async (uid) => {
        const { data: email } = await admin.rpc('get_auth_user_email', { p_user_id: uid })
        if (email && typeof email === 'string') {
          out[uid] = email
        }
      }),
    )
    return out
  } catch {
    return {}
  }
}

export type RevokeQrPermissionResult =
  | { ok: true }
  | { ok: false; message: string }

/**
 * 権限の「削除」（can_display=false）。RLS でクライアント更新が 0 件になる環境向けに service_role で実行し、サーバで権限検証する。
 */
export async function revokeSupervisorQrDisplayPermission(
  permissionId: string,
): Promise<RevokeQrPermissionResult> {
  const me = await getServerUser()
  if (!me?.id || !me.tenant_id) {
    return { ok: false, message: '認証情報を確認できませんでした。' }
  }

  try {
    const admin = createAdminClient()
    const { data: row, error: fetchErr } = await admin
      .from('supervisor_qr_permissions')
      .select('id, tenant_id, supervisor_user_id, can_display')
      .eq('id', permissionId)
      .maybeSingle()

    if (fetchErr || !row) {
      return { ok: false, message: '対象の権限が見つかりません。' }
    }

    const r = row as {
      id: string
      tenant_id: string
      supervisor_user_id: string
      can_display: boolean
    }

    if (r.tenant_id !== me.tenant_id) {
      return { ok: false, message: 'このテナントの権限ではありません。' }
    }

    if (!r.can_display) {
      return { ok: false, message: 'すでに取り消されています。' }
    }

    let allowHrWide = me.appRole === 'hr' || me.appRole === 'hr_manager'
    if (!allowHrWide) {
      const { data: emp } = await admin
        .from('employees')
        .select('app_role:app_role_id(app_role)')
        .eq('user_id', me.id)
        .eq('tenant_id', me.tenant_id)
        .maybeSingle()
      const slug = (emp as { app_role?: { app_role?: string | null } | null })?.app_role?.app_role
      allowHrWide = slug === 'hr' || slug === 'hr_manager'
    }

    const isSupervisor = r.supervisor_user_id === me.id
    if (!isSupervisor && !allowHrWide) {
      return { ok: false, message: '削除する権限がありません。' }
    }

    const { data: updated, error: upErr } = await admin
      .from('supervisor_qr_permissions')
      .update({ can_display: false })
      .eq('id', permissionId)
      .eq('tenant_id', me.tenant_id)
      .select('id')

    if (upErr) {
      return { ok: false, message: upErr.message }
    }
    if (!updated?.length) {
      return { ok: false, message: '更新できませんでした。' }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'エラーが発生しました。',
    }
  }
}
