import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  TurnoverRiskRow,
  TurnoverRiskSummary,
  ActionLog,
  EmployeeRawData,
  ActionType,
  ScoreFactors,
} from './types'

/** 最新リスクスコア一覧（従業員情報付き）を取得する */
export async function getTurnoverRiskRows(): Promise<TurnoverRiskRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  // calculated_at DESC でソートし JS 側で従業員ごとの最新スコアを取得
  const { data: scores, error: scoresError } = await supabase
    .from('turnover_risk_scores')
    .select('employee_id, risk_score, risk_level, score_factors, calculated_at')
    .eq('tenant_id', user.tenant_id)
    .order('calculated_at', { ascending: false })
    .limit(500)

  if (scoresError || !scores) return []

  const latestByEmployee = new Map<string, typeof scores[number]>()
  for (const s of scores) {
    if (!latestByEmployee.has(s.employee_id)) {
      latestByEmployee.set(s.employee_id, s)
    }
  }

  const { data: actions } = await supabase
    .from('turnover_risk_action_logs')
    .select('employee_id, action_type, actioned_at')
    .eq('tenant_id', user.tenant_id)
    .order('actioned_at', { ascending: false })
    .limit(500)

  const latestActionByEmployee = new Map<
    string,
    { action_type: string; actioned_at: string }
  >()
  for (const a of actions ?? []) {
    if (!latestActionByEmployee.has(a.employee_id)) {
      latestActionByEmployee.set(a.employee_id, a)
    }
  }

  const employeeIds = Array.from(latestByEmployee.keys())
  if (employeeIds.length === 0) return []

  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions(name)')
    .in('id', employeeIds)
    .eq('tenant_id', user.tenant_id)

  if (empError || !employees) return []

  const empMap = new Map(employees.map((e) => [e.id, e]))

  const rows: TurnoverRiskRow[] = []
  for (const [empId, score] of latestByEmployee) {
    const emp = empMap.get(empId)
    if (!emp) continue
    const action = latestActionByEmployee.get(empId)
    const divisionData = emp.divisions as { name: string } | { name: string }[] | null
    const departmentName = Array.isArray(divisionData)
      ? divisionData[0]?.name ?? null
      : divisionData?.name ?? null
    rows.push({
      employee_id: empId,
      employee_name: emp.name ?? '',
      department_name: departmentName,
      risk_score: score.risk_score,
      risk_level: score.risk_level as 'high' | 'medium' | 'low',
      score_factors: score.score_factors as unknown as ScoreFactors,
      calculated_at: score.calculated_at,
      latest_action_at: action?.actioned_at ?? null,
      latest_action_type: (action?.action_type as ActionType) ?? null,
    })
  }

  return rows.sort((a, b) => b.risk_score - a.risk_score)
}

/** ダッシュボード集計サマリーを取得する */
export async function getTurnoverRiskSummary(): Promise<TurnoverRiskSummary> {
  const rows = await getTurnoverRiskRows()
  const highCount = rows.filter((r) => r.risk_level === 'high').length
  const mediumCount = rows.filter((r) => r.risk_level === 'medium').length
  const lowCount = rows.filter((r) => r.risk_level === 'low').length
  const lastCalculatedAt =
    rows.length > 0
      ? rows.reduce((latest, r) =>
          r.calculated_at > latest.calculated_at ? r : latest
        ).calculated_at
      : null

  return { highCount, mediumCount, lowCount, totalCount: rows.length, lastCalculatedAt }
}

/** 特定従業員のアクションログを取得する */
export async function getActionLogs(employeeId: string): Promise<ActionLog[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('turnover_risk_action_logs')
    .select('id, employee_id, logged_by, action_type, notes, actioned_at')
    .eq('tenant_id', user.tenant_id)
    .eq('employee_id', employeeId)
    .order('actioned_at', { ascending: false })
    .limit(50)

  if (error || !data) return []
  return data as ActionLog[]
}

/**
 * スコア再計算に必要な生データを収集する
 * 既存テーブルを読み取り専用で参照する
 */
export async function collectEmployeeRawData(): Promise<EmployeeRawData[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()

  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })
  )
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  const prevPrevMonth = prevMonth === 1 ? 12 : prevMonth - 1
  const prevPrevMonthYear = prevMonth === 1 ? prevMonthYear - 1 : prevMonthYear

  const pad = (n: number) => String(n).padStart(2, '0')
  const prevYm = `${prevMonthYear}-${pad(prevMonth)}`
  const prevPrevYm = `${prevPrevMonthYear}-${pad(prevPrevMonth)}`
  const prevMonthStart = `${prevYm}-01`
  const prevMonthEnd = new Date(prevMonthYear, prevMonth, 0).toISOString().split('T')[0]
  const prevPrevMonthStart = `${prevPrevYm}-01`
  const prevPrevMonthEnd = new Date(prevPrevMonthYear, prevPrevMonth, 0)
    .toISOString()
    .split('T')[0]

  // 1. アクティブ従業員一覧（active_status カラム）
  const { data: employees } = await supabase
    .from('employees')
    .select('id, user_id')
    .eq('tenant_id', user.tenant_id)
    .eq('active_status', 'active')

  if (!employees || employees.length === 0) return []
  const employeeIds = employees.map((e) => e.id)
  const userIdToEmpId = new Map(
    employees.filter((e) => e.user_id).map((e) => [e.user_id!, e.id])
  )

  // 2. 最新ストレスチェック結果
  const { data: stressResults } = await supabase
    .from('stress_check_results')
    .select('employee_id, is_high_stress, calculated_at')
    .in('employee_id', employeeIds)
    .order('calculated_at', { ascending: false })
    .limit(employeeIds.length * 3)

  const latestStressByEmp = new Map<string, boolean>()
  for (const r of stressResults ?? []) {
    if (!latestStressByEmp.has(r.employee_id)) {
      latestStressByEmp.set(r.employee_id, r.is_high_stress ?? false)
    }
  }

  // 3. 残業時間（work_time_records から計算）
  const { data: prevWtr } = await supabase
    .from('work_time_records')
    .select('employee_id, start_time, end_time')
    .in('employee_id', employeeIds)
    .gte('record_date', prevMonthStart)
    .lte('record_date', prevMonthEnd)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)

  const { data: prevPrevWtr } = await supabase
    .from('work_time_records')
    .select('employee_id, start_time, end_time')
    .in('employee_id', employeeIds)
    .gte('record_date', prevPrevMonthStart)
    .lte('record_date', prevPrevMonthEnd)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null)

  function calcOvertimeHours(
    records: { employee_id: string; start_time: string | null; end_time: string | null }[]
  ): Map<string, number> {
    const map = new Map<string, number>()
    for (const r of records) {
      if (!r.start_time || !r.end_time) continue
      const workHours =
        (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 3600000
      const ot = Math.max(workHours - 8, 0)
      map.set(r.employee_id, (map.get(r.employee_id) ?? 0) + ot)
    }
    return map
  }

  const prevOtMap = calcOvertimeHours(prevWtr ?? [])
  const prevPrevOtMap = calcOvertimeHours(prevPrevWtr ?? [])

  // 4. パルスサーベイスコア（pulse_survey_responses は user_id 参照、score は 1-10）
  const userIds = employees.filter((e) => e.user_id).map((e) => e.user_id!)
  const latestSurveyByEmp = new Map<string, number>()

  if (userIds.length > 0) {
    const { data: pulseData } = await supabase
      .from('pulse_survey_responses')
      .select('user_id, score, survey_period')
      .in('user_id', userIds)
      .not('score', 'is', null)
      .order('survey_period', { ascending: false })
      .limit(userIds.length * 3)

    for (const p of pulseData ?? []) {
      const empId = userIdToEmpId.get(p.user_id)
      if (!empId || latestSurveyByEmp.has(empId) || p.score === null) continue
      // DBスコア 1-10 → ÷2 で 0-5 スケールに変換
      latestSurveyByEmp.set(empId, Math.round((p.score / 2) * 10) / 10)
    }
  }

  // 5. アンケート未回答数（submitted_at IS NULL = 未提出）
  const { data: assignments } = await supabase
    .from('questionnaire_assignments')
    .select('id, employee_id, assigned_at')
    .in('employee_id', employeeIds)
    .eq('tenant_id', user.tenant_id)
    .order('assigned_at', { ascending: false })
    .limit(employeeIds.length * 3)

  const assignmentIds = (assignments ?? []).map((a) => a.id)
  const { data: responses } = assignmentIds.length > 0
    ? await supabase
        .from('questionnaire_responses')
        .select('assignment_id, submitted_at')
        .in('assignment_id', assignmentIds)
    : { data: [] }

  const submittedSet = new Set(
    (responses ?? [])
      .filter((r) => r.submitted_at !== null)
      .map((r) => r.assignment_id)
  )

  const assignmentsByEmp = new Map<string, string[]>()
  for (const a of assignments ?? []) {
    const arr = assignmentsByEmp.get(a.employee_id) ?? []
    if (arr.length < 3) arr.push(a.id)
    assignmentsByEmp.set(a.employee_id, arr)
  }

  const unansweredCountMap = new Map<string, number>()
  for (const [empId, assignIds] of assignmentsByEmp) {
    const unanswered = assignIds.filter((id) => !submittedSet.has(id)).length
    unansweredCountMap.set(empId, unanswered)
  }

  return employeeIds.map((empId) => ({
    employee_id: empId,
    is_high_stress: latestStressByEmp.get(empId) ?? false,
    latest_survey_score: latestSurveyByEmp.get(empId) ?? null,
    overtime_hours_last_month: prevOtMap.get(empId) ?? 0,
    overtime_hours_two_months_ago: prevPrevOtMap.get(empId) ?? 0,
    unanswered_questionnaire_count: unansweredCountMap.get(empId) ?? 0,
  }))
}
