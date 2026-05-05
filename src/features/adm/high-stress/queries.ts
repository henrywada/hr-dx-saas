import { createClient } from '@/lib/supabase/server'
import { buildEmployeeEstablishmentMap } from '@/lib/stress/resolve-establishment'

export interface HighStressEmployee {
  result_id: string
  employee_id: string
  name: string
  employee_no: string | null
  division_id: string | null
  division_name: string | null
  division_layer: number | null
  /** 拠点マスタ解決結果（未登録時は null） */
  establishment_name: string | null
  score_a: number | null
  score_b: number | null
  score_c: number | null
  score_d: number | null
  scale_scores: any
  interview_requested: boolean
  interview_requested_at: string | null
  interview_record: {
    id: string
    interview_status: string
    doctor_opinion: string | null
    work_measures: string | null
    measure_details: string | null
    interview_date: string | null
  } | null
}

/**
 * 実施中の期間に該当する、高ストレス者でかつ企業に同意したユーザー一覧を取得
 */
export async function getHighStressEmployees(periodId: string): Promise<HighStressEmployee[]> {
  const supabase = await createClient()

  const { data: periodRow } = await supabase
    .from('stress_check_periods')
    .select('tenant_id')
    .eq('id', periodId)
    .maybeSingle()
  const tenantId = periodRow?.tenant_id as string | undefined

  const { data: results, error: resError } = await supabase
    .from('stress_check_results')
    .select(
      `
      id,
      is_high_stress,
      interview_requested,
      interview_requested_at,
      score_a, score_b, score_c, score_d,
      scale_scores,
      employee_id,
      employees (
        id, name, employee_no, division_id,
        divisions (name, layer)
      ),
      stress_check_interviews (
        id, interview_status, doctor_opinion, work_measures, measure_details, interview_date
      )
    `
    )
    .eq('period_id', periodId)
    .eq('is_high_stress', true)

  if (resError || !results) {
    console.error('getHighStressEmployees error:', resError?.message)
    return []
  }

  if (results.length === 0) return []

  const empIds = results.map(r => r.employee_id)
  const { data: submissions, error: subError } = await supabase
    .from('stress_check_submissions')
    .select('employee_id, consent_to_employer')
    .eq('period_id', periodId)
    .in('employee_id', empIds)
    .eq('consent_to_employer', true)

  if (subError || !submissions) {
    console.error('getHighStressEmployees submissions fetch error:', subError?.message)
    return []
  }

  const consentedEmpIds = new Set(submissions.map(s => s.employee_id))

  const filtered = results.filter(r => consentedEmpIds.has(r.employee_id))

  let estNameByEmp = new Map<string, string | null>()
  if (tenantId) {
    const { data: estMaster } = await supabase
      .from('division_establishments')
      .select('id, name')
      .eq('tenant_id', tenantId)
    const { data: divRows } = await supabase
      .from('divisions')
      .select('id, parent_id')
      .eq('tenant_id', tenantId)
    const { data: anchorRows } = await supabase
      .from('division_establishment_anchors')
      .select('division_establishment_id, division_id')
      .eq('tenant_id', tenantId)
    if (estMaster && estMaster.length > 0 && divRows) {
      const empsMini = filtered.map(r => {
        const emp = r.employees as { division_id?: string | null } | null
        return { id: r.employee_id, division_id: emp?.division_id ?? null }
      })
      const estMap = buildEmployeeEstablishmentMap(
        empsMini,
        tenantId,
        (anchorRows ?? []) as { division_establishment_id: string; division_id: string }[],
        divRows as { id: string; parent_id: string | null }[]
      )
      const nameByEstId = new Map(
        (estMaster as { id: string; name: string }[]).map(e => [e.id, e.name])
      )
      for (const r of filtered) {
        const eid = estMap.get(r.employee_id)
        estNameByEmp.set(r.employee_id, eid ? (nameByEstId.get(eid) ?? null) : null)
      }
    }
  }

  return filtered.map(r => {
    const emp = r.employees as {
      name?: string | null
      employee_no?: string | null
      division_id?: string | null
      divisions?: { name?: string | null; layer?: number | null } | null
    } | null
    const div = emp?.divisions
    const interviewList = (r.stress_check_interviews as unknown[]) || []
    const interview = interviewList.length > 0 ? (interviewList[0] as any) : null

    return {
      result_id: r.id,
      employee_id: r.employee_id,
      name: emp?.name || '不明',
      employee_no: emp?.employee_no || null,
      division_id: emp?.division_id ?? null,
      division_name: div?.name || null,
      division_layer: div?.layer ?? null,
      establishment_name: estNameByEmp.get(r.employee_id) ?? null,
      score_a: r.score_a,
      score_b: r.score_b,
      score_c: r.score_c,
      score_d: r.score_d,
      scale_scores: r.scale_scores,
      interview_requested: r.interview_requested,
      interview_requested_at: r.interview_requested_at,
      interview_record: interview
        ? {
            id: interview.id,
            interview_status: interview.interview_status,
            doctor_opinion: interview.doctor_opinion,
            work_measures: interview.work_measures,
            measure_details: interview.measure_details,
            interview_date: interview.interview_date,
          }
        : null,
    }
  })
}

export interface DivisionNode {
  id: string
  name: string
  parent_id: string | null
  layer: number | null
  code: string | null
  directEmployeeCount: number
}

/** テナントの全部署を従業員直接所属数付きで返す */
export async function getDivisionsWithCounts(tenantId: string): Promise<DivisionNode[]> {
  const supabase = await createClient()
  const [{ data: divs }, { data: emps }] = await Promise.all([
    supabase.from('divisions').select('id, name, parent_id, layer, code').eq('tenant_id', tenantId),
    supabase.from('employees').select('division_id').eq('tenant_id', tenantId),
  ])
  if (!divs) return []
  const countMap = new Map<string, number>()
  emps?.forEach(e => {
    if (e.division_id) countMap.set(e.division_id, (countMap.get(e.division_id) ?? 0) + 1)
  })
  return divs.map(d => ({
    id: d.id,
    name: d.name,
    parent_id: d.parent_id ?? null,
    layer: d.layer ?? null,
    code: d.code ?? null,
    directEmployeeCount: countMap.get(d.id) ?? 0,
  }))
}

/** ストレスチェック期間の部署別提出者数（直接所属のみ）を返す */
export async function getSubmissionCountsByDivision(
  tenantId: string,
  periodId: string
): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data: submissions } = await supabase
    .from('stress_check_submissions')
    .select('employee_id')
    .eq('period_id', periodId)
  if (!submissions || submissions.length === 0) return {}
  const empIds = submissions.map(s => s.employee_id)
  const { data: emps } = await supabase
    .from('employees')
    .select('id, division_id')
    .eq('tenant_id', tenantId)
    .in('id', empIds)
  if (!emps) return {}
  const result: Record<string, number> = {}
  emps.forEach(e => {
    if (e.division_id) result[e.division_id] = (result[e.division_id] ?? 0) + 1
  })
  return result
}
