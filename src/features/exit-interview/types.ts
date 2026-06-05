// 退職理由の構造的蓄積・傾向分析 専用型定義

export type MainReason =
  | 'compensation'
  | 'interpersonal'
  | 'career'
  | 'life_event'
  | 'management'
  | 'work_style'
  | 'company_direction'
  | 'other'

export type AgeGroup =
  | 'under_25'
  | '25_to_34'
  | '35_to_44'
  | '45_to_54'
  | '55_plus'
  | 'unknown'

export const MAIN_REASON_LABELS: Record<MainReason, string> = {
  compensation:       '待遇・給与',
  interpersonal:      '人間関係',
  career:             'キャリア・成長機会',
  life_event:         'ライフイベント',
  management:         '上司・マネジメント',
  work_style:         '働き方・環境',
  company_direction:  '会社の方向性',
  other:              'その他',
}

export const MAIN_REASON_COLORS: Record<MainReason, string> = {
  compensation:       '#3b82f6',
  interpersonal:      '#ef4444',
  career:             '#10b981',
  life_event:         '#f59e0b',
  management:         '#8b5cf6',
  work_style:         '#06b6d4',
  company_direction:  '#ec4899',
  other:              '#6b7280',
}

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  under_25:  '25歳未満',
  '25_to_34': '25〜34歳',
  '35_to_44': '35〜44歳',
  '45_to_54': '45〜54歳',
  '55_plus':  '55歳以上',
  unknown:   '不明',
}

export const SUB_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'salary_low',       label: '給与水準が低い' },
  { value: 'no_raise',         label: '昇給・昇格が見込めない' },
  { value: 'boss_conflict',    label: '上司との関係' },
  { value: 'colleague_issue',  label: '同僚・チームとの関係' },
  { value: 'no_growth',        label: 'スキルアップの機会がない' },
  { value: 'role_mismatch',    label: 'やりたい仕事ができない' },
  { value: 'marriage',         label: '結婚・パートナーの転勤' },
  { value: 'childcare',        label: '育児・介護' },
  { value: 'health',           label: '健康上の理由' },
  { value: 'long_hours',       label: '長時間労働・残業' },
  { value: 'remote_denied',    label: 'リモートワーク不可' },
  { value: 'vision_mismatch',  label: '会社の方向性と合わない' },
  { value: 'better_offer',     label: 'より良い条件の転職先' },
  { value: 'freelance',        label: '独立・起業' },
]

export const ALL_MAIN_REASONS: MainReason[] = [
  'compensation', 'interpersonal', 'career', 'life_event',
  'management', 'work_style', 'company_direction', 'other',
]

export const ALL_AGE_GROUPS: AgeGroup[] = [
  'under_25', '25_to_34', '35_to_44', '45_to_54', '55_plus', 'unknown',
]

export interface ExitInterview {
  id: string
  tenant_id: string
  employee_id: string | null
  employee_name: string
  department_name: string | null
  exit_date: string
  tenure_months: number
  age_group: AgeGroup
  main_reason: MainReason
  sub_reasons: string[]
  notes: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
}

export interface ReasonCount {
  reason: MainReason
  count: number
}

export interface MonthlyCount {
  year_month: string
  count: number
}

export interface DepartmentCount {
  department_name: string
  count: number
  top_reason: MainReason
}

export interface TenureGroupCount {
  tenure_group: string
  count: number
}

export interface AgeGroupCount {
  age_group: AgeGroup
  count: number
}

export interface ExitInterviewAnalytics {
  total: number
  reason_distribution: ReasonCount[]
  monthly_trend: MonthlyCount[]
  department_breakdown: DepartmentCount[]
  tenure_breakdown: TenureGroupCount[]
  age_breakdown: AgeGroupCount[]
}

export interface ExitInterviewInput {
  employee_id: string
  employee_name: string
  department_name: string
  exit_date: string
  age_group: AgeGroup
  main_reason: MainReason
  sub_reasons: string[]
  notes: string
}

export type ActionResult = { success: true } | { success: false; error: string }
