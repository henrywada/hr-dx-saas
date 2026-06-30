export type RiskLevel = 'high' | 'medium' | 'low'

export type ActionType = 'one_on_one' | 'counseling' | 'manager_talk' | 'hr_interview' | 'other'

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  one_on_one: '1on1 実施',
  counseling: 'カウンセリング',
  manager_talk: '上長面談',
  hr_interview: '人事面談',
  other: 'その他',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

export interface GrowthRiskDetails {
  /** 直近30日に1on1セッションなし（部下として） */
  one_on_one_overdue_30d: boolean
  /** 直近評価期間で評価未完了 */
  evaluation_not_confirmed: boolean
  /** スキル要件に対するギャップあり */
  has_skill_gap: boolean
  /** 未完了の eラーニング割当あり */
  has_incomplete_el: boolean
}

export interface ScoreFactors {
  stress_score: number
  survey_score: number
  overtime_score: number
  absence_score: number
  /** 成長・評価層因子の合計 */
  growth_score: number
  details: {
    is_high_stress: boolean
    latest_survey_score: number | null
    overtime_hours_last_month: number
    overtime_delta_hours: number
    unanswered_questionnaire_count: number
    growth: GrowthRiskDetails
  }
}

export interface TurnoverRiskRow {
  employee_id: string
  employee_name: string
  department_name: string | null
  risk_score: number
  risk_level: RiskLevel
  score_factors: ScoreFactors
  calculated_at: string
  latest_action_at: string | null
  latest_action_type: ActionType | null
}

export interface ActionLog {
  id: string
  employee_id: string
  logged_by: string
  action_type: ActionType
  notes: string | null
  actioned_at: string
}

export interface TurnoverRiskSummary {
  highCount: number
  mediumCount: number
  lowCount: number
  totalCount: number
  lastCalculatedAt: string | null
}

export interface EmployeeRawData {
  employee_id: string
  is_high_stress: boolean
  latest_survey_score: number | null
  overtime_hours_last_month: number
  overtime_hours_two_months_ago: number
  unanswered_questionnaire_count: number
  one_on_one_overdue_30d: boolean
  evaluation_not_confirmed: boolean
  has_skill_gap: boolean
  has_incomplete_el: boolean
}
