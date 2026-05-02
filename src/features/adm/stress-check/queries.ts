import { createClient } from '@/lib/supabase/server'
import { buildEmployeeEstablishmentMap } from '@/lib/stress/resolve-establishment'
import type {
  GroupAnalysisDepartment,
  GroupAnalysisSummary,
  ScaleAverages,
  DepartmentStat,
  ProgressStats,
  EstablishmentProgressStat,
  NotSubmittedEmployee,
} from './types'
import { buildEstablishmentProgressStats } from './progress-establishments'

// Supabase の型推論が深すぎるため、クエリ用に any でラップ
async function getSupabase() {
  return (await createClient()) as any
}

export type GroupData = {
  division_id: string
  name: string
  tenant_id: string
  member_count: number
  high_stress_rate: number | null
  health_risk: number | null
  workload: number | null
  control: number | null
  supervisor_support: number | null
  colleague_support: number | null
  previous_health_risk?: number | null
  period_name: string
  is_latest: boolean
  is_suppressed?: boolean
  analysis_kind?: 'division' | 'establishment' | 'layer'
}

/** 推移グラフ用：期間×グループの健康リスク */
export type GroupTrendRow = {
  division_id: string
  name: string
  period_name: string
  health_risk: number | null
}

export async function getGroupAnalysis(tenantId: string, latestOnly = true) {
  const supabase = await getSupabase()

  let query = supabase.from('stress_group_analysis')
    .select(
      `
      division_id,
      name,
      member_count,
      high_stress_rate,
      health_risk,
      workload,
      control,
      supervisor_support,
      colleague_support,
      previous_health_risk,
      period_name,
      is_latest
    `
    )
    .eq('tenant_id', tenantId)

  if (latestOnly) {
    query = query.eq('is_latest', true).order('health_risk', { ascending: false })
  } else {
    query = query.order('period_name', { ascending: true })
  }

  const { data, error } = await query

  if (error) {
    console.error('Group analysis query error:', error)
    throw error
  }

  return ((data || []) as any[]).map((r) => ({ ...r, analysis_kind: 'division' as const })) as GroupData[]
}

/** 拠点別・最新期間の集団分析 */
export async function getGroupAnalysisEstablishment(tenantId: string, latestOnly = true) {
  const supabase = await getSupabase()
  let query = supabase
    .from('stress_group_analysis_establishment')
    .select(
      `
      division_establishment_id,
      name,
      tenant_id,
      member_count,
      high_stress_rate,
      health_risk,
      workload,
      control,
      supervisor_support,
      colleague_support,
      previous_health_risk,
      period_name,
      is_latest,
      is_suppressed,
      min_respondents_threshold
    `,
    )
    .eq('tenant_id', tenantId)

  if (latestOnly) {
    query = query.eq('is_latest', true).order('health_risk', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('period_name', { ascending: true })
  }

  const { data, error } = await query
  if (error) {
    console.error('getGroupAnalysisEstablishment', error)
    throw error
  }
  return ((data || []) as any[]).map((r) => ({
    division_id: r.division_establishment_id,
    name: r.name,
    tenant_id: r.tenant_id,
    member_count: r.member_count,
    high_stress_rate: r.high_stress_rate,
    health_risk: r.health_risk,
    workload: r.workload,
    control: r.control,
    supervisor_support: r.supervisor_support,
    colleague_support: r.colleague_support,
    previous_health_risk: r.previous_health_risk,
    period_name: r.period_name,
    is_latest: r.is_latest,
    is_suppressed: r.is_suppressed,
    analysis_kind: 'establishment' as const,
  })) as GroupData[]
}

/** 拠点別トレンド */
export async function getGroupTrendEstablishment(tenantId: string): Promise<GroupTrendRow[]> {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('stress_group_analysis_establishment')
    .select('division_establishment_id, name, period_name, health_risk')
    .eq('tenant_id', tenantId)
    .order('period_name', { ascending: true })

  return ((data || []) as any[]).map((r) => ({
    division_id: r.division_establishment_id,
    name: r.name,
    period_name: r.period_name,
    health_risk: r.health_risk,
  }))
}

/** 組織レイヤー一覧（集団分析の軸選択用） */
export async function getDistinctDivisionLayers(tenantId: string): Promise<number[]> {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('divisions')
    .select('layer')
    .eq('tenant_id', tenantId)
    .not('layer', 'is', null)

  const set = new Set<number>()
  for (const row of data ?? []) {
    if (row.layer != null) set.add(row.layer as number)
  }
  return Array.from(set).sort((a, b) => a - b)
}

/** 指定レイヤーでの集団分析（RPC） */
export async function getGroupAnalysisForLayer(
  tenantId: string,
  layer: number,
  latestOnly = true,
): Promise<GroupData[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('stress_group_analysis_for_layer', {
    p_tenant_id: tenantId,
    p_layer: layer,
  })
  if (error) {
    console.error('getGroupAnalysisForLayer', error)
    throw error
  }
  let rows = (data || []) as any[]
  if (latestOnly) {
    rows = rows.filter((r) => r.is_latest)
    rows.sort((a, b) => (b.health_risk ?? -1) - (a.health_risk ?? -1))
  } else {
    rows.sort((a, b) => a.period_name.localeCompare(b.period_name))
  }
  return rows.map((r) => ({
    division_id: r.rollup_division_id,
    name: r.name,
    tenant_id: r.tenant_id,
    member_count: Number(r.member_count),
    high_stress_rate: r.high_stress_rate,
    health_risk: r.health_risk,
    workload: r.workload,
    control: r.control,
    supervisor_support: r.supervisor_support,
    colleague_support: r.colleague_support,
    previous_health_risk: r.previous_health_risk,
    period_name: r.period_name,
    is_latest: r.is_latest,
    is_suppressed: r.is_suppressed,
    analysis_kind: 'layer' as const,
  }))
}

export async function getGroupTrendForLayer(
  tenantId: string,
  layer: number,
): Promise<GroupTrendRow[]> {
  const supabase = await getSupabase()
  const { data, error } = await supabase.rpc('stress_group_analysis_for_layer', {
    p_tenant_id: tenantId,
    p_layer: layer,
  })
  if (error) {
    console.error('getGroupTrendForLayer', error)
    throw error
  }
  return ((data || []) as any[]).map((r) => ({
    division_id: r.rollup_division_id,
    name: r.name,
    period_name: r.period_name,
    health_risk: r.health_risk,
  }))
}

export async function getGroupTrend(tenantId: string): Promise<GroupTrendRow[]> {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('stress_group_analysis')
    .select('division_id, name, period_name, health_risk')
    .eq('tenant_id', tenantId)
    .order('period_name', { ascending: true })

  return (data || []) as GroupTrendRow[]
}
// ========== ここから追加（既存の getGroupAnalysis の下に貼り付け）==========

// 進行状況ページ用（元々存在していた関数）
/** テナント全体（拠点未設定）の実施中を最優先。無ければ拠点別の実施中から最新1件。 */
export async function getActiveStressCheckPeriod(tenantId: string) {
  const supabase = await getSupabase()

  const { data: legacy, error: errLegacy } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('division_establishment_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errLegacy) {
    console.error('getActiveStressCheckPeriod error:', errLegacy)
    return null
  }
  if (legacy) return legacy

  const { data: rows, error: errEst } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .not('division_establishment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (errEst) {
    console.error('getActiveStressCheckPeriod error:', errEst)
    return null
  }
  return rows?.[0] ?? null
}

/**
 * program_targets から is_eligible=true の対象者ID一覧を取得
 * レコードが無い場合は null を返し、後方互換として全従業員を対象とする
 */
async function getEligibleEmployeeIds(
  supabase: any,
  tenantId: string,
  periodId: string
): Promise<Set<string> | null> {
  const { data: targets } = await supabase
    .from('program_targets')
    .select('employee_id')
    .eq('tenant_id', tenantId)
    .eq('program_type', 'stress_check')
    .eq('program_instance_id', periodId)
    .eq('is_eligible', true)

  if (!targets || targets.length === 0) {
    return null // 後方互換: 全従業員を対象
  }
  return new Set(targets.map((t: { employee_id: string }) => t.employee_id))
}

/** 進捗統計（periodId 指定時は部署別含む完全版を返す） */
export async function getProgressStats(
  tenantId: string,
  periodId?: string
): Promise<ProgressStats> {
  const supabase = await getSupabase()

  // 全従業員数（後方互換用）
  const { count: totalAll } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  let submissionsCountQuery = supabase
    .from('stress_check_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'submitted')
  if (periodId) {
    submissionsCountQuery = submissionsCountQuery.eq('period_id', periodId)
  }
  const { count: completedAll } = await submissionsCountQuery

  // periodId 未指定の場合は簡易版（departments は空、従来通り全従業員を対象）
  if (!periodId) {
    const totalEmployees = totalAll || 0
    const submittedCount = completedAll || 0
    const notSubmittedCount = Math.max(0, totalEmployees - submittedCount)
    return {
      totalEmployees,
      submittedCount,
      notSubmittedCount,
      consentCount: 0,
      submissionRate: totalEmployees ? Math.round((submittedCount / totalEmployees) * 100) : 0,
      consentRate: 0,
      departments: [],
    }
  }

  // program_targets の is_eligible で対象者を絞る（無効は対象外）
  const eligibleIds = await getEligibleEmployeeIds(supabase, tenantId, periodId)

  // 同意数・提出データ取得
  const { data: submissions } = await supabase
    .from('stress_check_submissions')
    .select('employee_id, status, consent_to_employer')
    .eq('period_id', periodId)

  const submittedEmployeeIds = new Set<string>(
    (submissions ?? [])
      .filter((s) => s.status === 'submitted')
      .map((s) => String(s.employee_id))
  )

  // 対象者数・受検済み・未受検を is_eligible でフィルタ
  const { data: employees } = await supabase
    .from('employees')
    .select('id, division_id')
    .eq('tenant_id', tenantId)

  const allEmployees = employees ?? []
  const targetEmployees = eligibleIds
    ? allEmployees.filter((e) => eligibleIds.has(e.id))
    : allEmployees

  // 対象者数: program_targets と提出済み employee_id の和集合（非合意者を含める）
  const allTargetIds = new Set([
    ...(eligibleIds ?? []),
    ...submittedEmployeeIds,
    ...targetEmployees.map((e) => e.id),
  ])
  const totalEmployees = allTargetIds.size
  const submittedCount = submittedEmployeeIds.size
  const notSubmittedCount = Math.max(0, totalEmployees - submittedCount)

  // 同意数: 受検完了（status='submitted'）かつ同意した者のみ（対象者全体から集計）
  const consentCount =
    submissions?.filter(
      (s) => s.status === 'submitted' && s.consent_to_employer === true
    ).length ?? 0

  // この画面は拠点別進捗を主軸にするため、部署別ツリー用の集計は行わない。
  const departments: DepartmentStat[] = []

  // 拠点別（マスタがあれば）
  const { data: estMaster } = await supabase
    .from('division_establishments')
    .select('id, name')
    .eq('tenant_id', tenantId)

  let establishments: EstablishmentProgressStat[] | undefined
  if (estMaster && estMaster.length > 0) {
    const [{ data: divRowsForEst }, { data: anchorRows }] = await Promise.all([
      supabase.from('divisions').select('id, parent_id').eq('tenant_id', tenantId),
      supabase
        .from('division_establishment_anchors')
        .select('division_establishment_id, division_id')
        .eq('tenant_id', tenantId),
    ])
    const estMap = buildEmployeeEstablishmentMap(
      targetEmployees,
      tenantId,
      (anchorRows ?? []) as { division_establishment_id: string; division_id: string }[],
      divRowsForEst ?? [],
    )
    establishments = buildEstablishmentProgressStats({
      establishments: estMaster.map((est: { id: string; name: string | null }) => ({
        id: est.id,
        name: est.name ?? '名称未設定',
      })),
      employees: targetEmployees,
      submittedEmployeeIds,
      submissions: submissions ?? [],
      employeeEstablishmentMap: estMap,
    })
  }

  return {
    totalEmployees,
    submittedCount,
    notSubmittedCount,
    consentCount,
    submissionRate: totalEmployees ? Math.round((submittedCount / totalEmployees) * 100) : 0,
    consentRate: submittedCount ? Math.round((consentCount / submittedCount) * 100) : 0,
    departments,
    establishments,
  }
}

/** 未受検者一覧を取得（氏名・社員番号・部署・役職） */
export async function getNotSubmittedEmployees(
  tenantId: string,
  periodId: string,
  establishmentId?: string
) {
  const supabase = await getSupabase()

  const eligibleIds = await getEligibleEmployeeIds(supabase, tenantId, periodId)

  const { data: submissions } = await supabase
    .from('stress_check_submissions')
    .select('employee_id')
    .eq('period_id', periodId)
    .eq('status', 'submitted')

  const submittedEmployeeIds = new Set(
    (submissions ?? []).map((s: { employee_id: string }) => s.employee_id)
  )

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, name, employee_no, job_title, division_id')
    .eq('tenant_id', tenantId)

  if (employeesError) throw employeesError

  const allEmployees = employees ?? []
  const targetEmployees = eligibleIds
    ? allEmployees.filter((e) => eligibleIds.has(e.id))
    : allEmployees

  const notSubmittedIds = targetEmployees
    .filter((e) => !submittedEmployeeIds.has(e.id))
    .map((e) => e.id)

  if (notSubmittedIds.length === 0) {
    return []
  }

  const [divisionsResult, anchorsResult, establishmentsResult] =
    await Promise.all([
      supabase.from('divisions').select('id, parent_id, name').eq('tenant_id', tenantId),
      supabase
        .from('division_establishment_anchors')
        .select('division_establishment_id, division_id')
        .eq('tenant_id', tenantId),
      supabase.from('division_establishments').select('id, name').eq('tenant_id', tenantId),
    ])

  if (divisionsResult.error) throw divisionsResult.error
  if (anchorsResult.error) throw anchorsResult.error
  if (establishmentsResult.error) throw establishmentsResult.error

  const divRowsForEst = divisionsResult.data
  const anchorRows = anchorsResult.data
  const estRows = establishmentsResult.data
  const divNameById = new Map(
    ((divRowsForEst ?? []) as { id: string; name: string | null }[]).map((division) => [
      division.id,
      division.name,
    ]),
  )

  const estMap = buildEmployeeEstablishmentMap(
    allEmployees,
    tenantId,
    (anchorRows ?? []) as { division_establishment_id: string; division_id: string }[],
    divRowsForEst ?? [],
  )
  const estNameById = new Map(
    ((estRows ?? []) as { id: string; name: string | null }[]).map((est) => [
      est.id,
      est.name ?? '名称未設定',
    ]),
  )

  return targetEmployees
    .filter((employee) => !submittedEmployeeIds.has(employee.id))
    .sort((a, b) => (a.employee_no ?? '').localeCompare(b.employee_no ?? '', 'ja'))
    .map((r): NotSubmittedEmployee => {
      const resolvedEstablishmentId = estMap.get(r.id) ?? null
      return {
        id: r.id,
        name: r.name ?? null,
        employee_no: r.employee_no ?? null,
        job_title: r.job_title ?? null,
        division_id: r.division_id ?? null,
        division_name: r.division_id ? (divNameById.get(r.division_id) ?? null) : null,
        establishment_id: resolvedEstablishmentId,
        establishment_name: resolvedEstablishmentId
          ? (estNameById.get(resolvedEstablishmentId) ?? '名称未設定')
          : '拠点未割当',
      }
    })
    .filter((employee) => {
      if (!establishmentId) return true
      if (establishmentId === 'unassigned') return employee.establishment_id === null
      return employee.establishment_id === establishmentId
    })
}

/** リマインド送信用：未受検者の id, name, user_id を取得（メール送信先の特定に使用） */
export async function getNotSubmittedEmployeesForReminder(
  tenantId: string,
  periodId: string,
  establishmentId?: string | null
): Promise<{ id: string; name: string | null; user_id: string | null }[]> {
  const supabase = await getSupabase()

  const eligibleIds = await getEligibleEmployeeIds(supabase, tenantId, periodId)

  const { data: submissions } = await supabase
    .from('stress_check_submissions')
    .select('employee_id')
    .eq('period_id', periodId)
    .eq('status', 'submitted')

  const submittedEmployeeIds = new Set(
    (submissions ?? []).map((s: { employee_id: string }) => s.employee_id)
  )

  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, user_id, division_id')
    .eq('tenant_id', tenantId)

  const allEmployees = employees ?? []
  const targetEmployees = eligibleIds
    ? allEmployees.filter((e) => eligibleIds.has(e.id))
    : allEmployees

  let notSubmitted = targetEmployees.filter((e) => !submittedEmployeeIds.has(e.id))

  if (establishmentId) {
    const [divisionsResult, anchorsResult] = await Promise.all([
      supabase.from('divisions').select('id, parent_id, name').eq('tenant_id', tenantId),
      supabase
        .from('division_establishment_anchors')
        .select('division_establishment_id, division_id')
        .eq('tenant_id', tenantId),
    ])

    if (divisionsResult.error) throw divisionsResult.error
    if (anchorsResult.error) throw anchorsResult.error

    const estMap = buildEmployeeEstablishmentMap(
      allEmployees,
      tenantId,
      (anchorsResult.data ?? []) as { division_establishment_id: string; division_id: string }[],
      divisionsResult.data ?? [],
    )

    notSubmitted = notSubmitted.filter((e) => {
      const resolved = estMap.get(e.id) ?? null
      if (establishmentId === 'unassigned') return resolved === null
      return resolved === establishmentId
    })
  }

  return notSubmitted.map((e) => ({
    id: e.id,
    name: e.name ?? null,
    user_id: e.user_id ?? null,
  }))
}

/** ヒートマップページ用：期間指定で集団分析データを取得（10名未満はマスキング） */
export async function getGroupAnalysisData(
  tenantId: string,
  periodId: string
): Promise<{ departments: GroupAnalysisDepartment[]; summary: GroupAnalysisSummary }> {
  const supabase = await getSupabase()

  // 期間の title を取得
  const { data: period } = await supabase
    .from('stress_check_periods')
    .select('title')
    .eq('id', periodId)
    .single()

  if (!period?.title) {
    return { departments: [], summary: createEmptySummary() }
  }

  const { data: tss } = await supabase
    .from('tenant_stress_settings')
    .select('min_group_analysis_respondents')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  const minRespondents = tss?.min_group_analysis_respondents ?? 11

  // stress_group_analysis から該当期間のデータを取得（period_name でフィルタ）
  const { data: rows, error } = await supabase
    .from('stress_group_analysis')
    .select(
      `
      division_id,
      name,
      member_count,
      high_stress_rate,
      health_risk,
      workload,
      control,
      supervisor_support,
      colleague_support,
      period_name
    `
    )
    .eq('tenant_id', tenantId)
    .eq('period_name', period.title)

  if (error) {
    console.error('getGroupAnalysisData error:', error)
    throw error
  }

  const raw = (rows || []) as GroupData[]
  const departments: GroupAnalysisDepartment[] = raw.map((r) => {
    const isMasked = r.member_count < minRespondents
    const hr = r.high_stress_rate ?? 0
    const scaleAverages: ScaleAverages = {
      workloadQuantity: r.workload,
      workloadQuality: null,
      control: r.control,
      supervisorSupport: r.supervisor_support,
      coworkerSupport: r.colleague_support,
      vitality: null,
    }
    return {
      departmentName: r.name,
      respondentCount: r.member_count,
      isMasked,
      scaleAverages,
      avgScoreA: r.workload,
      avgScoreB: r.control,
      avgScoreC: r.supervisor_support,
      avgScoreD: r.colleague_support,
      highStressCount: Math.round((r.member_count * hr) / 100),
      highStressRate: hr,
      totalHealthRisk: isMasked ? null : r.health_risk,
    }
  })

  const visible = departments.filter((d) => !d.isMasked)
  const totalRespondents = visible.reduce((s, d) => s + d.respondentCount, 0)
  const totalHighStress = visible.reduce((s, d) => s + d.highStressCount, 0)
  const healthRiskSum = visible.reduce(
    (s, d) => s + (d.totalHealthRisk ?? 0) * d.respondentCount,
    0
  )

  const summary: GroupAnalysisSummary = {
    totalRespondents,
    overallHighStressRate: totalRespondents ? (totalHighStress / totalRespondents) * 100 : 0,
    overallHealthRisk:
      totalRespondents > 0 ? healthRiskSum / totalRespondents : null,
    maskedDepartmentCount: departments.filter((d) => d.isMasked).length,
    overallScaleAverages: computeOverallScaleAverages(visible),
  }

  return { departments, summary }
}

function createEmptySummary(): GroupAnalysisSummary {
  return {
    totalRespondents: 0,
    overallHighStressRate: 0,
    overallHealthRisk: null,
    maskedDepartmentCount: 0,
    overallScaleAverages: {
      workloadQuantity: null,
      workloadQuality: null,
      control: null,
      supervisorSupport: null,
      coworkerSupport: null,
      vitality: null,
    },
  }
}

function computeOverallScaleAverages(
  depts: GroupAnalysisDepartment[]
): ScaleAverages {
  const n = depts.length
  if (n === 0) return createEmptySummary().overallScaleAverages

  const sum = (key: keyof ScaleAverages) =>
    depts.reduce((s, d) => s + ((d.scaleAverages[key] as number) || 0), 0)

  return {
    workloadQuantity: sum('workloadQuantity') / n,
    workloadQuality: sum('workloadQuality') / n || null,
    control: sum('control') / n,
    supervisorSupport: sum('supervisorSupport') / n,
    coworkerSupport: sum('coworkerSupport') / n,
    vitality: sum('vitality') / n || null,
  }
}
