import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  EngagementDashboardData,
  PulseTrendPoint,
  StressTrendPoint,
  QuestionnaireTrendPoint,
  DepartmentEngagementRow,
} from './types'

const toDisplayScore = (dbScore: number) => Math.round((dbScore / 2) * 10) / 10

function periodToLabel(period: string): string {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return `${year}年${month}月度`
}

function deptStatus(composite: number): 'good' | 'caution' | 'alert' {
  if (composite >= 70) return 'good'
  if (composite >= 45) return 'caution'
  return 'alert'
}

const EMPTY: EngagementDashboardData = {
  pulseTrend: [],
  latestPulseScore: null,
  latestPulsePeriod: null,
  stressTrend: [],
  latestHighStressRate: null,
  questionnaireTrend: [],
  latestQuestionnaireResponseRate: null,
  departments: [],
  hasPulseData: false,
  hasStressData: false,
  hasQuestionnaireData: false,
}

/** 統合エンゲージメントダッシュボード用データを収集する（既存テーブル読み取りのみ） */
export async function getEngagementDashboardData(): Promise<EngagementDashboardData> {
  const user = await getServerUser()
  if (!user?.tenant_id) return EMPTY

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  // 1. 従業員リスト（user_id → division 逆引き用）
  const { data: empRaw } = await supabase
    .from('employees')
    .select('id, user_id, divisions(id, name)')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')

  type EmpRow = { id: string; user_id: string | null; divisions: { id: string; name: string } | null }
  const employees = (empRaw ?? []) as EmpRow[]
  const userIdToEmpId = new Map<string, string>(
    employees.filter(e => e.user_id).map(e => [e.user_id!, e.id])
  )
  const empIdToDivision = new Map<string, { id: string; name: string }>(
    employees.filter(e => e.divisions).map(e => [e.id, e.divisions!])
  )
  const divisionMap = new Map<string, string>()
  for (const emp of employees) {
    if (emp.divisions) divisionMap.set(emp.divisions.id, emp.divisions.name)
  }

  // ----------------------------------------------------------------
  // 2. パルスサーベイ集計（直近12ヶ月）
  // pulse_survey_responses.score は 1-10、表示は ÷2 で 0-5.0 スケール
  // user_id は auth.users.id（employees.id ではない）
  // ----------------------------------------------------------------
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const twelveMonthsAgoYm = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}`

  const { data: pulseRaw } = await supabase
    .from('pulse_survey_responses')
    .select('user_id, score, survey_period')
    .eq('tenant_id', user.tenant_id)
    .gte('survey_period', twelveMonthsAgoYm)
    .not('score', 'is', null)

  type PulseRow = { user_id: string; score: number; survey_period: string }
  const pulseData = (pulseRaw ?? []) as PulseRow[]

  const pulseByPeriod = new Map<string, { scoreSum: number; scoreCount: number; respondedUsers: Set<string> }>()
  for (const r of pulseData) {
    const acc = pulseByPeriod.get(r.survey_period) ?? { scoreSum: 0, scoreCount: 0, respondedUsers: new Set() }
    acc.scoreSum += r.score
    acc.scoreCount++
    acc.respondedUsers.add(r.user_id)
    pulseByPeriod.set(r.survey_period, acc)
  }

  const totalEmployees = employees.length
  const pulseTrend: PulseTrendPoint[] = Array.from(pulseByPeriod.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, acc]) => ({
      period,
      label: periodToLabel(period),
      score: acc.scoreCount > 0 ? toDisplayScore(acc.scoreSum / acc.scoreCount) : 0,
      responseRate: totalEmployees > 0 ? Math.round((acc.respondedUsers.size / totalEmployees) * 100) : 0,
    }))

  const latestPulsePoint = pulseTrend.length > 0 ? pulseTrend[pulseTrend.length - 1] : null

  // ----------------------------------------------------------------
  // 3. ストレスチェック集計（直近3期）
  // ----------------------------------------------------------------
  const { data: stressPeriodRaw } = await supabase
    .from('stress_check_periods')
    .select('id, title, start_date, end_date')
    .eq('tenant_id', user.tenant_id)
    .order('start_date', { ascending: false })
    .limit(3)

  type StressPeriodRow = { id: string; title: string; start_date: string; end_date: string }
  const stressPeriods = (stressPeriodRaw ?? []) as StressPeriodRow[]

  let stressTrend: StressTrendPoint[] = []
  let latestHighStressRate: number | null = null

  if (stressPeriods.length > 0) {
    const periodIds = stressPeriods.map(p => p.id)
    const { data: stressResultRaw } = await supabase
      .from('stress_check_results')
      .select('period_id, is_high_stress, employee_id')
      .eq('tenant_id', user.tenant_id)
      .in('period_id', periodIds)

    type StressResultRow = { period_id: string; is_high_stress: boolean; employee_id: string }
    const stressResults = (stressResultRaw ?? []) as StressResultRow[]

    const resultByPeriod = new Map<string, { total: number; highCount: number }>()
    for (const r of stressResults) {
      const acc = resultByPeriod.get(r.period_id) ?? { total: 0, highCount: 0 }
      acc.total++
      if (r.is_high_stress) acc.highCount++
      resultByPeriod.set(r.period_id, acc)
    }

    stressTrend = stressPeriods
      .filter(p => resultByPeriod.has(p.id))
      .map(p => {
        const acc = resultByPeriod.get(p.id)!
        const rate = acc.total > 0 ? Math.round((acc.highCount / acc.total) * 100) : 0
        return {
          periodTitle: p.title,
          periodStart: p.start_date,
          highStressRate: rate,
          totalCount: acc.total,
          highStressCount: acc.highCount,
        }
      })
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart))

    if (stressTrend.length > 0) {
      latestHighStressRate = stressTrend[stressTrend.length - 1].highStressRate
    }
  }

  // ----------------------------------------------------------------
  // 4. アンケート（Echo）回答率集計（直近6期）
  // submitted_at IS NULL = 未提出、NOT NULL = 提出済み
  // ----------------------------------------------------------------
  const { data: questPeriodRaw } = await supabase
    .from('questionnaire_periods')
    .select('id, label, start_date, questionnaire_id')
    .eq('tenant_id', user.tenant_id)
    .order('start_date', { ascending: false })
    .limit(6)

  type QuestPeriodRow = { id: string; label: string | null; start_date: string | null; questionnaire_id: string }
  const questPeriods = (questPeriodRaw ?? []) as QuestPeriodRow[]

  let questionnaireTrend: QuestionnaireTrendPoint[] = []
  let latestQuestionnaireResponseRate: number | null = null

  if (questPeriods.length > 0) {
    const qPeriodIds = questPeriods.map(p => p.id)

    const { data: assignRaw } = await supabase
      .from('questionnaire_assignments')
      .select('id, period_id, employee_id')
      .eq('tenant_id', user.tenant_id)
      .in('period_id', qPeriodIds)

    type AssignRow = { id: string; period_id: string | null; employee_id: string }
    const assignments = (assignRaw ?? []) as AssignRow[]
    const assignmentIds = assignments.map(a => a.id)

    const { data: responseRaw } =
      assignmentIds.length > 0
        ? await supabase
            .from('questionnaire_responses')
            .select('assignment_id, submitted_at')
            .in('assignment_id', assignmentIds)
        : { data: [] }

    type RespRow = { assignment_id: string; submitted_at: string | null }
    const responses = (responseRaw ?? []) as RespRow[]
    const submittedSet = new Set(responses.filter(r => r.submitted_at !== null).map(r => r.assignment_id))

    const questByPeriod = new Map<string, { total: number; submitted: number }>()
    for (const a of assignments) {
      if (!a.period_id) continue
      const acc = questByPeriod.get(a.period_id) ?? { total: 0, submitted: 0 }
      acc.total++
      if (submittedSet.has(a.id)) acc.submitted++
      questByPeriod.set(a.period_id, acc)
    }

    questionnaireTrend = questPeriods
      .filter(p => questByPeriod.has(p.id))
      .map(p => {
        const acc = questByPeriod.get(p.id)!
        const rate = acc.total > 0 ? Math.round((acc.submitted / acc.total) * 100) : 0
        return {
          periodLabel: p.label ?? p.start_date ?? p.id,
          periodStart: p.start_date ?? '',
          responseRate: rate,
          submittedCount: acc.submitted,
          totalCount: acc.total,
        }
      })
      .sort((a, b) => a.periodStart.localeCompare(b.periodStart))

    if (questionnaireTrend.length > 0) {
      latestQuestionnaireResponseRate = questionnaireTrend[questionnaireTrend.length - 1].responseRate
    }
  }

  // ----------------------------------------------------------------
  // 5. 部署別ヒートマップ集計（各ソースの最新期）
  // ----------------------------------------------------------------

  // 5a. パルス（最新期）：部署別平均スコア
  const divPulseScore = new Map<string, { scoreSum: number; count: number }>()
  if (latestPulsePoint) {
    for (const r of pulseData.filter(p => p.survey_period === latestPulsePoint.period)) {
      const empId = userIdToEmpId.get(r.user_id)
      if (!empId) continue
      const div = empIdToDivision.get(empId)
      if (!div) continue
      const acc = divPulseScore.get(div.id) ?? { scoreSum: 0, count: 0 }
      acc.scoreSum += r.score
      acc.count++
      divPulseScore.set(div.id, acc)
    }
  }

  // 5b. ストレス（最新期）：部署別高ストレス率
  const divStressRate = new Map<string, { total: number; high: number }>()
  if (stressPeriods.length > 0) {
    const latestStressPeriodId = stressPeriods[0].id
    const { data: latestStressRaw } = await supabase
      .from('stress_check_results')
      .select('employee_id, is_high_stress')
      .eq('tenant_id', user.tenant_id)
      .eq('period_id', latestStressPeriodId)

    type LSRow = { employee_id: string; is_high_stress: boolean }
    for (const r of (latestStressRaw ?? []) as LSRow[]) {
      const div = empIdToDivision.get(r.employee_id)
      if (!div) continue
      const acc = divStressRate.get(div.id) ?? { total: 0, high: 0 }
      acc.total++
      if (r.is_high_stress) acc.high++
      divStressRate.set(div.id, acc)
    }
  }

  // 5c. アンケート（最新期）：部署別回答率
  const divQuestRate = new Map<string, { total: number; submitted: number }>()
  if (questPeriods.length > 0) {
    const latestQPeriodId = questPeriods[0].id
    const { data: latestAssignRaw } = await supabase
      .from('questionnaire_assignments')
      .select('id, employee_id')
      .eq('tenant_id', user.tenant_id)
      .eq('period_id', latestQPeriodId)

    type LARow = { id: string; employee_id: string }
    const latestAssignments = (latestAssignRaw ?? []) as LARow[]
    const latestAssignIds = latestAssignments.map(a => a.id)

    const { data: latestRespRaw } =
      latestAssignIds.length > 0
        ? await supabase
            .from('questionnaire_responses')
            .select('assignment_id, submitted_at')
            .in('assignment_id', latestAssignIds)
        : { data: [] }

    type LRRow = { assignment_id: string; submitted_at: string | null }
    const latestSubmittedSet = new Set(
      ((latestRespRaw ?? []) as LRRow[])
        .filter(r => r.submitted_at !== null)
        .map(r => r.assignment_id)
    )

    for (const a of latestAssignments) {
      const div = empIdToDivision.get(a.employee_id)
      if (!div) continue
      const acc = divQuestRate.get(div.id) ?? { total: 0, submitted: 0 }
      acc.total++
      if (latestSubmittedSet.has(a.id)) acc.submitted++
      divQuestRate.set(div.id, acc)
    }
  }

  // 5d. 合成スコア計算（0〜100）
  // パルス（0〜5 → 0〜40pt）+ ストレス低率（0〜30pt）+ 回答率（0〜30pt）
  // データが無い指標は除外して残りの重みで按分
  const departments: DepartmentEngagementRow[] = []
  for (const [divId, divName] of divisionMap) {
    const pulseAcc = divPulseScore.get(divId)
    const stressAcc = divStressRate.get(divId)
    const questAcc = divQuestRate.get(divId)

    const pulseScore = pulseAcc && pulseAcc.count > 0
      ? toDisplayScore(pulseAcc.scoreSum / pulseAcc.count)
      : null
    const highStressRate = stressAcc && stressAcc.total > 0
      ? Math.round((stressAcc.high / stressAcc.total) * 100)
      : null
    const questionnaireResponseRate = questAcc && questAcc.total > 0
      ? Math.round((questAcc.submitted / questAcc.total) * 100)
      : null

    let compositeSum = 0
    let compositeWeight = 0
    if (pulseScore !== null) { compositeSum += (pulseScore / 5) * 40; compositeWeight += 40 }
    if (highStressRate !== null) { compositeSum += ((100 - highStressRate) / 100) * 30; compositeWeight += 30 }
    if (questionnaireResponseRate !== null) { compositeSum += (questionnaireResponseRate / 100) * 30; compositeWeight += 30 }

    const compositeScore = compositeWeight > 0
      ? Math.round((compositeSum / compositeWeight) * 100)
      : 0

    departments.push({
      divisionId: divId,
      divisionName: divName,
      pulseScore,
      highStressRate,
      questionnaireResponseRate,
      compositeScore,
      status: deptStatus(compositeScore),
    })
  }

  departments.sort((a, b) => a.compositeScore - b.compositeScore)

  return {
    pulseTrend,
    latestPulseScore: latestPulsePoint?.score ?? null,
    latestPulsePeriod: latestPulsePoint?.label ?? null,
    stressTrend,
    latestHighStressRate,
    questionnaireTrend,
    latestQuestionnaireResponseRate,
    departments,
    hasPulseData: pulseTrend.length > 0,
    hasStressData: stressTrend.length > 0,
    hasQuestionnaireData: questionnaireTrend.length > 0,
  }
}
