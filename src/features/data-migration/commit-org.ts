import { normalizeEmployeeNo } from '@/features/health-check/csv-parse'
import { buildDivisionPlans, divisionKey } from './org-tree'
import type { EmployeeCsvRow } from './types'
import { EMPLOYEE_APP_ROLE, MIGRATION_TEMP_PASSWORD } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

function existingDivisionKeys(
  divisions: { id: string; name: string | null; parent_id: string | null; layer: number | null }[]
): Map<string, string> {
  const byId = new Map(divisions.map(d => [d.id, d]))
  const keyById = new Map<string, string>()
  const walk = (id: string): string => {
    const cached = keyById.get(id)
    if (cached) return cached
    const d = byId.get(id)
    if (!d) return ''
    const name = (d.name ?? '').trim()
    const parentKey = d.parent_id ? walk(d.parent_id) : ''
    const key = parentKey ? `${parentKey}\0${name}` : name
    keyById.set(id, key)
    return key
  }
  const map = new Map<string, string>()
  for (const d of divisions) {
    const key = walk(d.id)
    if (key) map.set(key, d.id)
  }
  return map
}

async function ensureAuthUser(
  supabase: AnyClient,
  email: string
): Promise<{ userId: string; created: boolean } | { error: string }> {
  const { data, error } = await supabase.rpc('create_auth_user', {
    p_email: email,
    p_password: MIGRATION_TEMP_PASSWORD,
  })
  if (!error && data) return { userId: data as string, created: true }
  return { error: error?.message ?? '認証ユーザーの作成に失敗しました' }
}

export async function upsertDivisionsAndEmployees(input: {
  supabase: AnyClient
  tenantId: string
  rows: EmployeeCsvRow[]
  skipErrors: boolean
}): Promise<{
  ok: boolean
  error?: string
  divisionsCreated: number
  employeesCreated: number
  employeesUpdated: number
  skipped: number
}> {
  const { supabase, tenantId, skipErrors } = input
  const empty = {
    divisionsCreated: 0,
    employeesCreated: 0,
    employeesUpdated: 0,
    skipped: 0,
  }
  const valid = input.rows.filter(r => !r.error)
  const skipped = skipErrors ? input.rows.length - valid.length : 0
  if (!skipErrors && input.rows.some(r => r.error)) {
    return { ...empty, ok: false, error: '従業員CSVにエラーがあります' }
  }

  const { data: role } = await supabase
    .from('app_role')
    .select('id')
    .eq('app_role', EMPLOYEE_APP_ROLE)
    .maybeSingle()
  if (!role?.id) return { ...empty, ok: false, error: 'app_role employee が見つかりません' }

  const { data: existingDivs } = await supabase
    .from('divisions')
    .select('id, name, parent_id, layer')
    .eq('tenant_id', tenantId)
  const idByKey = existingDivisionKeys(existingDivs ?? [])
  let divisionsCreated = 0
  for (const plan of buildDivisionPlans(valid)) {
    const existingId = idByKey.get(plan.key)
    if (existingId) continue
    const parentId = plan.parentKey ? (idByKey.get(plan.parentKey) ?? null) : null
    const { data: inserted, error } = await supabase
      .from('divisions')
      .insert({
        tenant_id: tenantId,
        name: plan.name,
        parent_id: parentId,
        layer: plan.layer,
      })
      .select('id')
      .single()
    if (error || !inserted) {
      return { ...empty, ok: false, error: error?.message ?? '部署の登録に失敗しました' }
    }
    idByKey.set(plan.key, inserted.id)
    divisionsCreated += 1
  }

  const { data: existingEmps } = await supabase
    .from('employees')
    .select('id, employee_no, user_id')
    .eq('tenant_id', tenantId)
  const empByNo = new Map<string, { id: string; userId: string | null }>()
  for (const e of existingEmps ?? []) {
    const no = normalizeEmployeeNo(e.employee_no)
    if (no) empByNo.set(no, { id: e.id, userId: e.user_id ?? null })
  }

  let employeesCreated = 0
  let employeesUpdated = 0
  for (const row of valid) {
    const divisionId =
      row.orgPath.length > 0 ? (idByKey.get(divisionKey(row.orgPath)) ?? null) : null
    const existing = empByNo.get(row.employeeNo)
    if (existing) {
      const patch: Record<string, unknown> = {
        name: row.name,
        employee_no: row.employeeNo,
        sex: row.sex,
        division_id: divisionId,
      }
      // 以前の移行でログイン未作成なら、再実行時に認証済アカウントを付ける
      if (!existing.userId) {
        const auth = await ensureAuthUser(supabase, row.email)
        if ('error' in auth) return { ...empty, ok: false, error: `${row.email}: ${auth.error}` }
        patch.user_id = auth.userId
        patch.app_role_id = role.id
        patch.active_status = 'active'
        const { error } = await supabase
          .from('employees')
          .update(patch)
          .eq('id', existing.id)
          .eq('tenant_id', tenantId)
        if (error) {
          if (auth.created) await supabase.rpc('delete_auth_user', { p_user_id: auth.userId })
          return { ...empty, ok: false, error: error.message }
        }
        existing.userId = auth.userId
        employeesUpdated += 1
        continue
      }
      const { error } = await supabase
        .from('employees')
        .update(patch)
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)
      if (error) return { ...empty, ok: false, error: error.message }
      employeesUpdated += 1
    } else {
      const auth = await ensureAuthUser(supabase, row.email)
      if ('error' in auth) return { ...empty, ok: false, error: `${row.email}: ${auth.error}` }
      const { data: inserted, error } = await supabase
        .from('employees')
        .insert({
          tenant_id: tenantId,
          name: row.name,
          employee_no: row.employeeNo,
          sex: row.sex,
          division_id: divisionId,
          app_role_id: role.id,
          active_status: 'active',
          is_manager: false,
          user_id: auth.userId,
        })
        .select('id')
        .single()
      if (error || !inserted) {
        if (auth.created) await supabase.rpc('delete_auth_user', { p_user_id: auth.userId })
        return { ...empty, ok: false, error: error?.message ?? '従業員の登録に失敗しました' }
      }
      empByNo.set(row.employeeNo, { id: inserted.id, userId: auth.userId })
      employeesCreated += 1
    }
  }

  return {
    ok: true,
    divisionsCreated,
    employeesCreated,
    employeesUpdated,
    skipped,
  }
}
