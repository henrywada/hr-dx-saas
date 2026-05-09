'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import type { StressCheckPeriod } from '@/features/stress-check/types'

function revalidateStressPeriodPaths() {
  revalidatePath(APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS)
  revalidatePath('/adm/stress-check/progress')
  revalidatePath('/adm/stress-check/mnt_sets')
}

/** 拠点に紐づく実施期間一覧（旧方式 / 後方互換） */
export async function fetchPeriodsForEstablishment(
  establishmentId: string
): Promise<StressCheckPeriod[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('division_establishment_id', establishmentId)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('fetchPeriodsForEstablishment', error)
    return []
  }
  return (data ?? []) as StressCheckPeriod[]
}

/** 実施グループ（division ベース）を新規作成し、対象 division を紐付ける */
export async function createStressCheckPeriod(data: {
  tenant_id: string
  title: string
  comment?: string | null
  workplace_name?: string | null
  workplace_address?: string | null
  labor_office_name?: string | null
  questionnaire_type: '57' | '23'
  start_date: string
  end_date: string
  fiscal_year: number
  divisionIds: string[]
}) {
  const supabase = await createClient()

  // 1. periods テーブルに INSERT（division ベース新方式は establishment_id = null）
  const { data: result, error } = await supabase
    .from('stress_check_periods')
    .insert({
      tenant_id: data.tenant_id,
      division_establishment_id: null,
      title: data.title,
      comment: data.comment ?? null,
      workplace_name: data.workplace_name ?? null,
      workplace_address: data.workplace_address ?? null,
      labor_office_name: data.labor_office_name ?? null,
      questionnaire_type: data.questionnaire_type,
      status: 'active',
      start_date: data.start_date,
      end_date: data.end_date,
      fiscal_year: data.fiscal_year,
    })
    .select()
    .single()

  if (error) {
    console.error('createStressCheckPeriod error:', error)
    return { success: false as const, error: error.message }
  }

  // 2. period_divisions に一括 INSERT
  if (data.divisionIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: divErr } = await (supabase as any).from('stress_check_period_divisions').insert(
      data.divisionIds.map(division_id => ({
        period_id: result.id,
        division_id,
        tenant_id: data.tenant_id,
      }))
    )
    if (divErr) {
      console.error('createStressCheckPeriod divisions error:', divErr)
      return { success: false as const, error: divErr.message }
    }
  }

  revalidateStressPeriodPaths()
  return { success: true as const, data: result }
}

/** 実施グループを更新（division リストは全削除→再 INSERT で差分更新） */
export async function updateStressCheckPeriod(
  id: string,
  updates: {
    title?: string
    comment?: string | null
    workplace_name?: string | null
    workplace_address?: string | null
    labor_office_name?: string | null
    questionnaire_type?: '57' | '23'
    start_date?: string
    end_date?: string
    fiscal_year?: number
    divisionIds?: string[]
  }
) {
  const supabase = await createClient()
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false as const, error: '認証エラー' }

  const { divisionIds, ...periodUpdates } = updates

  const { data: result, error } = await supabase
    .from('stress_check_periods')
    .update(periodUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('updateStressCheckPeriod error:', error)
    return { success: false as const, error: error.message }
  }

  // division リストが渡された場合：全削除→再 INSERT
  if (divisionIds !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delErr } = await (supabase as any)
      .from('stress_check_period_divisions')
      .delete()
      .eq('period_id', id)

    if (delErr) {
      console.error('updateStressCheckPeriod delete divisions error:', delErr)
      return { success: false as const, error: delErr.message }
    }

    if (divisionIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase as any)
        .from('stress_check_period_divisions')
        .insert(
          divisionIds.map(division_id => ({
            period_id: id,
            division_id,
            tenant_id: user.tenant_id,
          }))
        )
      if (insErr) {
        console.error('updateStressCheckPeriod insert divisions error:', insErr)
        return { success: false as const, error: insErr.message }
      }
    }
  }

  revalidateStressPeriodPaths()
  return { success: true as const, data: result }
}

export async function deleteStressCheckPeriod(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('stress_check_periods').delete().eq('id', id)

  if (error) {
    console.error('deleteStressCheckPeriod error:', error)
    return { success: false as const, error: error.message }
  }
  revalidateStressPeriodPaths()
  return { success: true as const }
}

/** 対象 division 群（配下の部署を含む）に属する従業員一覧と除外済みIDを取得 */
export async function getEmployeesInPeriodDivisions(periodId: string, divisionIds: string[]) {
  const user = await getServerUser()
  if (!user?.tenant_id || divisionIds.length === 0)
    return { success: true as const, data: [], excludedIds: [] }

  const supabase = await createClient()

  const [{ data: allDivisions }, { data: allEmployees }, { data: targets }] = await Promise.all([
    supabase.from('divisions').select('id, parent_id').eq('tenant_id', user.tenant_id),
    supabase
      .from('employees')
      .select('id, employee_no, name, division_id')
      .eq('tenant_id', user.tenant_id)
      .order('employee_no', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('program_targets')
      .select('employee_id, is_eligible')
      .eq('tenant_id', user.tenant_id)
      .eq('program_type', 'stress_check')
      .eq('program_instance_id', periodId),
  ])

  const coveredIds = new Set<string>(divisionIds)
  const parentMap = new Map<string, string | null>(
    (allDivisions ?? []).map((d: { id: string; parent_id: string | null }) => [d.id, d.parent_id])
  )

  const isCovered = (divisionId: string | null): boolean => {
    let cur: string | null = divisionId
    const guard = new Set<string>()
    while (cur && !guard.has(cur)) {
      if (coveredIds.has(cur)) return true
      guard.add(cur)
      cur = parentMap.get(cur) ?? null
    }
    return false
  }

  const data = (allEmployees ?? []).filter((e: { division_id: string | null }) =>
    isCovered(e.division_id)
  )

  const excludedIds = (targets ?? [])
    .filter((t: { is_eligible: boolean }) => !t.is_eligible)
    .map((t: { employee_id: string }) => t.employee_id)

  return { success: true as const, data, excludedIds }
}

/** 対象者フラグを upsert（要件4: 実施グループ内の対象者指定） */
export async function upsertProgramTarget(
  periodId: string,
  employeeId: string,
  isEligible: boolean,
  exclusionReason?: string
) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false as const, error: '認証エラー' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('program_targets').upsert(
    {
      tenant_id: user.tenant_id,
      program_type: 'stress_check',
      program_instance_id: periodId,
      employee_id: employeeId,
      is_eligible: isEligible,
      exclusion_reason: exclusionReason ?? null,
    },
    { onConflict: 'program_type,program_instance_id,employee_id' }
  )

  if (error) {
    console.error('upsertProgramTarget error:', error)
    return { success: false as const, error: error.message }
  }
  revalidatePath('/adm/stress-check/mnt_sets')
  return { success: true as const }
}
