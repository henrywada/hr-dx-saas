import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

/**
 * 進捗・集団分析・未受検集計用（RLS バイパス）。
 * VIEW/RPC が security_invoker のため、通常クライアントだと従業員 RLS で
 * 自分の行しか見えずモード切替しても同じ1件に見える。テナント管理者画面では
 * service role で集計する。呼び出し側で必ず tenant_id を条件に含めること。
 */
function getAdminSupabase() {
  return createAdminClient() as any
}

/** 拠点マスタ、なければ実施グループ対象部署を仮想拠点として返す */
type EstablishmentMappingContext = {
  source: 'master' | 'period_divisions' | 'none'
  establishments: { id: string; name: string }[]
  anchorLinks: { division_establishment_id: string; division_id: string }[]
  divisions: { id: string; parent_id: string | null; name: string | null }[]
}

async function loadEstablishmentMappingContext(
  supabase: any,
  tenantId: string,
  periodId: string
): Promise<EstablishmentMappingContext> {
  const [{ data: estMaster }, { data: divisions }] = await Promise.all([
    supabase.from('division_establishments').select('id, name').eq('tenant_id', tenantId),
    supabase.from('divisions').select('id, parent_id, name').eq('tenant_id', tenantId),
  ])

  const divRows = (divisions ?? []) as {
    id: string
    parent_id: string | null
    name: string | null
  }[]
  const divsForPath = divRows.map(d => ({
    id: d.id,
    name: d.name ?? '—',
    parent_id: d.parent_id,
  }))

  if (estMaster && estMaster.length > 0) {
    const { data: anchorRows } = await supabase
      .from('division_establishment_anchors')
      .select('division_establishment_id, division_id')
      .eq('tenant_id', tenantId)

    return {
      source: 'master',
      establishments: (estMaster as { id: string; name: string | null }[]).map(est => ({
        id: est.id,
        name: est.name ?? '名称未設定',
      })),
      anchorLinks: (anchorRows ?? []) as {
        division_establishment_id: string
        division_id: string
      }[],
      divisions: divRows,
    }
  }

  // 拠点マスタ未登録時: 実施グループの対象部署を仮想拠点として扱う
  const { data: periodDivs } = await supabase
    .from('stress_check_period_divisions')
    .select('division_id')
    .eq('period_id', periodId)
    .eq('tenant_id', tenantId)

  const periodDivisionIds = [
    ...new Set(
      ((periodDivs ?? []) as { division_id: string }[]).map(d => d.division_id).filter(Boolean)
    ),
  ]

  if (periodDivisionIds.length === 0) {
    return {
      source: 'none',
      establishments: [],
      anchorLinks: [],
      divisions: divRows,
    }
  }

  return {
    source: 'period_divisions',
    establishments: periodDivisionIds.map(id => ({
      id,
      name: buildFullPath(id, divsForPath) || '名称未設定',
    })),
    anchorLinks: periodDivisionIds.map(divisionId => ({
      division_establishment_id: divisionId,
      division_id: divisionId,
    })),
    divisions: divRows,
  }
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
  code?: string | null
}

/** 推移グラフ用：期間×グループの健康リスク */
export type GroupTrendRow = {
  division_id: string
  name: string
  period_name: string
  health_risk: number | null
}

export async function getGroupAnalysis(tenantId: string, latestOnly = true) {
  const supabase = getAdminSupabase()

  let query = supabase
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

  return ((data || []) as any[]).map(r => ({
    ...r,
    analysis_kind: 'division' as const,
  })) as GroupData[]
}

/** 拠点別・最新期間の集団分析 */
export async function getGroupAnalysisEstablishment(tenantId: string, latestOnly = true) {
  const supabase = getAdminSupabase()
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
    `
    )
    .eq('tenant_id', tenantId)

  if (latestOnly) {
    query = query
      .eq('is_latest', true)
      .order('health_risk', { ascending: false, nullsFirst: false })
  } else {
    query = query.order('period_name', { ascending: true })
  }

  const { data, error } = await query
  if (error) {
    console.error('getGroupAnalysisEstablishment', error)
    throw error
  }
  return ((data || []) as any[]).map(r => ({
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
  const supabase = getAdminSupabase()
  const { data } = await supabase
    .from('stress_group_analysis_establishment')
    .select('division_establishment_id, name, period_name, health_risk')
    .eq('tenant_id', tenantId)
    .order('period_name', { ascending: true })

  return ((data || []) as any[]).map(r => ({
    division_id: r.division_establishment_id,
    name: r.name,
    period_name: r.period_name,
    health_risk: r.health_risk,
  }))
}

/** 組織レイヤー一覧（集団分析の軸選択用）
 *  layer 列は不正確な場合があるため parent_id から実際の木深さを計算して返す
 */
export async function getDistinctDivisionLayers(tenantId: string): Promise<number[]> {
  const supabase = getAdminSupabase()
  const { data } = await supabase
    .from('divisions')
    .select('id, parent_id')
    .eq('tenant_id', tenantId)

  const nodes = (data ?? []) as { id: string; parent_id: string | null }[]

  // parent_id を辿って実際の深さを計算（ルート = 1）
  const depthMap = new Map<string, number>()
  for (const n of nodes) {
    if (n.parent_id === null) depthMap.set(n.id, 1)
  }
  let changed = true
  while (changed) {
    changed = false
    for (const n of nodes) {
      if (!depthMap.has(n.id) && n.parent_id != null && depthMap.has(n.parent_id)) {
        depthMap.set(n.id, depthMap.get(n.parent_id)! + 1)
        changed = true
      }
    }
  }

  const depths = new Set<number>(depthMap.values())
  return Array.from(depths).sort((a, b) => a - b)
}

/** 指定レイヤーでの集団分析（RPC） */
export async function getGroupAnalysisForLayer(
  tenantId: string,
  layer: number,
  latestOnly = true
): Promise<GroupData[]> {
  const supabase = getAdminSupabase()
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
    rows = rows.filter(r => r.is_latest)
    rows.sort((a, b) => (b.health_risk ?? -1) - (a.health_risk ?? -1))
  } else {
    rows.sort((a, b) => a.period_name.localeCompare(b.period_name))
  }
  return rows.map(r => ({
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
  layer: number
): Promise<GroupTrendRow[]> {
  const supabase = getAdminSupabase()
  const { data, error } = await supabase.rpc('stress_group_analysis_for_layer', {
    p_tenant_id: tenantId,
    p_layer: layer,
  })
  if (error) {
    console.error('getGroupTrendForLayer', error)
    throw error
  }
  return ((data || []) as any[]).map(r => ({
    division_id: r.rollup_division_id,
    name: r.name,
    period_name: r.period_name,
    health_risk: r.health_risk,
  }))
}

export async function getGroupTrend(tenantId: string): Promise<GroupTrendRow[]> {
  const supabase = getAdminSupabase()
  const { data } = await supabase
    .from('stress_group_analysis')
    .select('division_id, name, period_name, health_risk')
    .eq('tenant_id', tenantId)
    .order('period_name', { ascending: true })

  return (data || []) as GroupTrendRow[]
}

/** 全社集計（1行）: 部署別データを人数加重平均で合算して返す */
export async function getGroupAnalysisCompanyWide(tenantId: string): Promise<GroupData[]> {
  const divisions = await getGroupAnalysis(tenantId, true)
  const totalMembers = divisions.reduce((s, d) => s + d.member_count, 0)

  /** SQL VIEW と同様に小数第1位で丸める */
  const round1 = (n: number) => Math.round(n * 10) / 10

  const wavg = (key: keyof GroupData): number | null => {
    const valid = divisions.filter(d => !d.is_suppressed && d[key] != null)
    if (valid.length === 0) return null
    const tm = valid.reduce((s, d) => s + d.member_count, 0)
    if (tm <= 0) return null
    return round1(valid.reduce((s, d) => s + (d[key] as number) * d.member_count, 0) / tm)
  }

  const prevValid = divisions.filter(d => !d.is_suppressed && d.previous_health_risk != null)
  const prevTm = prevValid.reduce((s, d) => s + d.member_count, 0)
  const previousAvg =
    prevTm > 0
      ? round1(
          prevValid.reduce((s, d) => s + (d.previous_health_risk as number) * d.member_count, 0) /
            prevTm,
        )
      : null

  const periodName = divisions.find(d => d.period_name)?.period_name ?? ''
  const isSuppressed = divisions.every(d => d.is_suppressed)

  return [
    {
      division_id: 'all',
      name: '全社',
      tenant_id: tenantId,
      member_count: totalMembers,
      high_stress_rate: wavg('high_stress_rate'),
      health_risk: wavg('health_risk'),
      workload: wavg('workload'),
      control: wavg('control'),
      supervisor_support: wavg('supervisor_support'),
      colleague_support: wavg('colleague_support'),
      previous_health_risk: previousAvg,
      period_name: periodName,
      is_latest: true,
      is_suppressed: isSuppressed,
      analysis_kind: 'division' as const,
    },
  ]
}

/** divisions テーブルをフラットに取得（フルパス構築・コードソート用） */
export async function getDivisionsFlat(tenantId: string) {
  const supabase = getAdminSupabase()
  const { data } = await supabase
    .from('divisions')
    .select('id, name, parent_id, code')
    .eq('tenant_id', tenantId)
  return (data ?? []) as {
    id: string
    name: string
    parent_id: string | null
    code: string | null
  }[]
}

/** division_id から上位層を遡って ` / ` 区切りのフルパスを生成 */
export function buildFullPath(
  divisionId: string,
  divisions: { id: string; name: string; parent_id: string | null }[]
): string {
  const divMap = new Map(divisions.map(d => [d.id, d]))
  const parts: string[] = []
  let current = divMap.get(divisionId)
  while (current) {
    parts.unshift(current.name)
    current = current.parent_id ? divMap.get(current.parent_id) : undefined
  }
  return parts.join(' / ')
}

/** 全社推移（1系列）: 期間ごとに健康リスクを単純平均して返す */
export async function getGroupTrendCompanyWide(tenantId: string): Promise<GroupTrendRow[]> {
  const rows = await getGroupTrend(tenantId)

  const byPeriod = new Map<string, number[]>()
  for (const r of rows) {
    if (r.health_risk == null) continue
    const arr = byPeriod.get(r.period_name) ?? []
    arr.push(r.health_risk)
    byPeriod.set(r.period_name, arr)
  }

  return Array.from(byPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period_name, vals]) => ({
      division_id: 'all',
      name: '全社',
      period_name,
      health_risk: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10,
    }))
}
// ========== ここから追加（既存の getGroupAnalysis の下に貼り付け）==========

// 進行状況ページ用（元々存在していた関数）
/** 本日が期間内の active 実施期間一覧（新しい順） */
export async function listActiveStressCheckPeriods(tenantId: string) {
  const supabase = await getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('listActiveStressCheckPeriods error:', error)
    return []
  }
  return data ?? []
}

/**
 * 進捗画面用の実施中期間を取得。
 * 本日が start_date〜end_date に含まれる status=active を対象とし、
 * 拠点未設定（テナント全体）を最優先、無ければ拠点別の最新1件。
 */
export async function getActiveStressCheckPeriod(tenantId: string) {
  const supabase = await getSupabase()
  const today = new Date().toISOString().split('T')[0]

  const { data: legacy, error: errLegacy } = await supabase
    .from('stress_check_periods')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .is('division_establishment_id', null)
    .lte('start_date', today)
    .gte('end_date', today)
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
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })
    .limit(1)

  if (errEst) {
    console.error('getActiveStressCheckPeriod error:', errEst)
    return null
  }
  return rows?.[0] ?? null
}

/**
 * 実施期間の対象者IDを解決する（進捗・未受検・リマインド共通）
 *
 * 定義（対象者管理モーダル / 受検可否判定と一致）:
 * 1. program_targets.is_eligible = false は除外
 * 2. stress_check_period_divisions がある → その部署（子孫含む）の従業員
 * 3. 対象部署がなく division_establishment_id のみ → 当該拠点の従業員
 * 4. いずれも未設定 → テナント全従業員（全員対象）
 *
 * ※ program_targets.is_eligible=true の行だけをホワイトリストにする旧実装は誤り
 *   （除外解除で1件だけ true が残ると対象者が1名になる）
 */
async function resolvePeriodTargetEmployeeIds(
  supabase: any,
  tenantId: string,
  periodId: string
): Promise<Set<string>> {
  const [{ data: allEmployees }, { data: targets }, { data: periodDivs }, { data: period }] =
    await Promise.all([
      supabase.from('employees').select('id, division_id').eq('tenant_id', tenantId),
      supabase
        .from('program_targets')
        .select('employee_id, is_eligible')
        .eq('tenant_id', tenantId)
        .eq('program_type', 'stress_check')
        .eq('program_instance_id', periodId),
      supabase
        .from('stress_check_period_divisions')
        .select('division_id')
        .eq('period_id', periodId),
      supabase
        .from('stress_check_periods')
        .select('division_establishment_id')
        .eq('id', periodId)
        .maybeSingle(),
    ])

  const excludedIds = new Set<string>(
    (targets ?? [])
      .filter((t: { is_eligible: boolean }) => t.is_eligible === false)
      .map((t: { employee_id: string }) => t.employee_id)
  )

  const employees = (allEmployees ?? []) as { id: string; division_id: string | null }[]
  const selectedDivisionIds: string[] = (periodDivs ?? []).map(
    (r: { division_id: string }) => r.division_id
  )

  let scoped = employees

  if (selectedDivisionIds.length > 0) {
    const { data: allDivisions } = await supabase
      .from('divisions')
      .select('id, parent_id')
      .eq('tenant_id', tenantId)

    const parentMap = new Map<string, string | null>(
      (allDivisions ?? []).map((d: { id: string; parent_id: string | null }) => [d.id, d.parent_id])
    )
    const selectedSet = new Set(selectedDivisionIds)

    const isCovered = (divisionId: string | null): boolean => {
      let cur: string | null = divisionId
      const guard = new Set<string>()
      while (cur && !guard.has(cur)) {
        if (selectedSet.has(cur)) return true
        guard.add(cur)
        cur = parentMap.get(cur) ?? null
      }
      return false
    }

    scoped = employees.filter(e => isCovered(e.division_id))
  } else if (period?.division_establishment_id) {
    const { data: divRows } = await supabase
      .from('divisions')
      .select('id, parent_id')
      .eq('tenant_id', tenantId)
    const { data: anchorRows } = await supabase
      .from('division_establishment_anchors')
      .select('division_establishment_id, division_id')
      .eq('tenant_id', tenantId)

    const estMap = buildEmployeeEstablishmentMap(
      employees,
      tenantId,
      (anchorRows ?? []) as { division_establishment_id: string; division_id: string }[],
      divRows ?? []
    )
    scoped = employees.filter(e => estMap.get(e.id) === period.division_establishment_id)
  }
  // else: 対象部署・拠点未設定 → テナント全員

  return new Set(scoped.filter(e => !excludedIds.has(e.id)).map(e => e.id))
}

/** 進捗統計（periodId 指定時は部署別含む完全版を返す） */
export async function getProgressStats(
  tenantId: string,
  periodId?: string
): Promise<ProgressStats> {
  // 受検完了集計は RLS の影響を受けないよう admin クライアントを使用（app_role による除外はしない）
  const supabase = getAdminSupabase()

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

  // 対象部署（未設定なら全員）− 明示除外 で対象者を決定
  const targetIds = await resolvePeriodTargetEmployeeIds(supabase, tenantId, periodId)

  // 同意数・提出データ取得
  const { data: submissions } = await supabase
    .from('stress_check_submissions')
    .select('employee_id, status, consent_to_employer')
    .eq('period_id', periodId)

  const submittedEmployeeIds = new Set<string>(
    (submissions ?? [])
      .filter(s => s.status === 'submitted' && targetIds.has(String(s.employee_id)))
      .map(s => String(s.employee_id))
  )

  const { data: employees } = await supabase
    .from('employees')
    .select('id, division_id')
    .eq('tenant_id', tenantId)

  const allEmployees = employees ?? []
  const targetEmployees = allEmployees.filter(e => targetIds.has(e.id))

  const totalEmployees = targetIds.size
  const submittedCount = submittedEmployeeIds.size
  const notSubmittedCount = Math.max(0, totalEmployees - submittedCount)

  // 同意数: 対象者かつ受検完了かつ同意した者
  const consentCount =
    submissions?.filter(
      s =>
        s.status === 'submitted' &&
        s.consent_to_employer === true &&
        targetIds.has(String(s.employee_id))
    ).length ?? 0

  // この画面は拠点別進捗を主軸にするため、部署別ツリー用の集計は行わない。
  const departments: DepartmentStat[] = []

  // 拠点別: 拠点マスタ優先。未登録時は実施グループの対象部署でフォールバック
  const mapping = await loadEstablishmentMappingContext(supabase, tenantId, periodId)

  let establishments: EstablishmentProgressStat[] | undefined
  let establishmentSource: ProgressStats['establishmentSource']

  if (mapping.source !== 'none') {
    const estMap = buildEmployeeEstablishmentMap(
      targetEmployees,
      tenantId,
      mapping.anchorLinks,
      mapping.divisions
    )
    establishments = buildEstablishmentProgressStats({
      establishments: mapping.establishments,
      employees: targetEmployees,
      submittedEmployeeIds,
      submissions: submissions ?? [],
      employeeEstablishmentMap: estMap,
    })
    establishmentSource = mapping.source
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
    establishmentSource,
  }
}

/** 未受検者一覧を取得（氏名・社員番号・部署・役職） */
export async function getNotSubmittedEmployees(
  tenantId: string,
  periodId: string,
  establishmentId?: string
) {
  const supabase = getAdminSupabase()

  const targetIds = await resolvePeriodTargetEmployeeIds(supabase, tenantId, periodId)

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
  const targetEmployees = allEmployees.filter(e => targetIds.has(e.id))

  const notSubmittedIds = targetEmployees
    .filter(e => !submittedEmployeeIds.has(e.id))
    .map(e => e.id)

  if (notSubmittedIds.length === 0) {
    return []
  }

  const mapping = await loadEstablishmentMappingContext(supabase, tenantId, periodId)
  const divNameById = new Map(mapping.divisions.map(division => [division.id, division.name]))
  const estNameById = new Map(mapping.establishments.map(est => [est.id, est.name]))

  const estMap = buildEmployeeEstablishmentMap(
    allEmployees,
    tenantId,
    mapping.anchorLinks,
    mapping.divisions
  )

  return targetEmployees
    .filter(employee => !submittedEmployeeIds.has(employee.id))
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
    .filter(employee => {
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
  const supabase = getAdminSupabase()

  const targetIds = await resolvePeriodTargetEmployeeIds(supabase, tenantId, periodId)

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
  const targetEmployees = allEmployees.filter(e => targetIds.has(e.id))

  let notSubmitted = targetEmployees.filter(e => !submittedEmployeeIds.has(e.id))

  if (establishmentId) {
    const mapping = await loadEstablishmentMappingContext(supabase, tenantId, periodId)
    const estMap = buildEmployeeEstablishmentMap(
      allEmployees,
      tenantId,
      mapping.anchorLinks,
      mapping.divisions
    )

    notSubmitted = notSubmitted.filter(e => {
      const resolved = estMap.get(e.id) ?? null
      if (establishmentId === 'unassigned') return resolved === null
      return resolved === establishmentId
    })
  }

  return notSubmitted.map(e => ({
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
  const supabase = getAdminSupabase()

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
  const departments: GroupAnalysisDepartment[] = raw.map(r => {
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

  const visible = departments.filter(d => !d.isMasked)
  const totalRespondents = visible.reduce((s, d) => s + d.respondentCount, 0)
  const totalHighStress = visible.reduce((s, d) => s + d.highStressCount, 0)
  const healthRiskSum = visible.reduce(
    (s, d) => s + (d.totalHealthRisk ?? 0) * d.respondentCount,
    0
  )

  const summary: GroupAnalysisSummary = {
    totalRespondents,
    overallHighStressRate: totalRespondents ? (totalHighStress / totalRespondents) * 100 : 0,
    overallHealthRisk: totalRespondents > 0 ? healthRiskSum / totalRespondents : null,
    maskedDepartmentCount: departments.filter(d => d.isMasked).length,
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

function computeOverallScaleAverages(depts: GroupAnalysisDepartment[]): ScaleAverages {
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
