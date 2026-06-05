/** 準備度レベル */
export type ReadinessLevel = 'ready_now' | 'one_to_two_years' | 'three_to_five_years'

export const READINESS_LABELS: Record<ReadinessLevel, string> = {
  ready_now: 'Ready Now',
  one_to_two_years: '1〜2年後',
  three_to_five_years: '3〜5年後',
}

export const READINESS_COLORS: Record<ReadinessLevel, string> = {
  ready_now: 'bg-green-100 text-green-800',
  one_to_two_years: 'bg-yellow-100 text-yellow-800',
  three_to_five_years: 'bg-blue-100 text-blue-800',
}

/** ポジションリスクレベル */
export type PositionRiskLevel = 'high' | 'medium' | 'low'

export const RISK_LEVEL_LABELS: Record<PositionRiskLevel, string> = {
  high: '高リスク',
  medium: '中リスク',
  low: '低リスク',
}

export const RISK_LEVEL_COLORS: Record<PositionRiskLevel, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

/** 後継候補（一覧表示用） */
export interface CandidateRow {
  id: string
  position_id: string
  employee_id: string
  employee_name: string
  department_name: string | null
  readiness: ReadinessLevel
  performance_score: number
  potential_score: number
  development_actions: string | null
  notes: string | null
}

/** ポジション（候補者付き） */
export interface PositionWithCandidates {
  id: string
  title: string
  division_id: string | null
  division_name: string | null
  current_holder_id: string | null
  current_holder_name: string | null
  risk_level: PositionRiskLevel
  notes: string | null
  is_active: boolean
  candidates: CandidateRow[]
}

/** ダッシュボード全体データ */
export interface SuccessionDashboardData {
  positions: PositionWithCandidates[]
  noSuccessorCount: number
  readyNowCount: number
  totalCandidateCount: number
}

/** ポジション登録フォーム入力 */
export interface PositionFormInput {
  title: string
  division_id: string | null
  current_holder_id: string | null
  risk_level: PositionRiskLevel
  notes: string
}

/** 候補者登録フォーム入力 */
export interface CandidateFormInput {
  position_id: string
  employee_id: string
  readiness: ReadinessLevel
  performance_score: number
  potential_score: number
  development_actions: string
  notes: string
}

/** Server Action 戻り値 */
export type ActionResult = { success: true } | { success: false; error: string }

/** 従業員セレクト用 */
export interface EmployeeOption {
  id: string
  name: string
  department_name: string | null
}

/** 部署セレクト用 */
export interface DivisionOption {
  id: string
  name: string
}
