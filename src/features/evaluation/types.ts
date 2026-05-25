import type {
  EvaluationTemplateType,
  EvaluationAxis,
  MboCategory,
} from '@/features/global-evaluation-templates/types'

export type { EvaluationTemplateType, EvaluationAxis, MboCategory }
export {
  TEMPLATE_TYPE_LABELS,
  AXIS_LABELS,
  AXIS_SUBTITLES,
} from '@/features/global-evaluation-templates/types'

// ---- フロー状態 ----

export type FlowStatus =
  | 'draft'
  | 'goal_set'
  | 'self_eval'
  | 'self_submitted'
  | 'primary_eval'
  | 'primary_submitted'
  | 'secondary_eval'
  | 'secondary_submitted'
  | 'confirming'
  | 'confirmed'

export const FLOW_STATUS_LABELS: Record<FlowStatus, string> = {
  draft: '下書き',
  goal_set: '目標設定完了',
  self_eval: '自己評価中',
  self_submitted: '自己評価済',
  primary_eval: '一次評価中',
  primary_submitted: '一次評価済',
  secondary_eval: '二次評価中',
  secondary_submitted: '二次評価済',
  confirming: '確定者確認中',
  confirmed: '確定',
}

// ---- 評価ロール ----

export type EvaluationRole = 'self' | 'primary' | 'secondary' | 'confirmer' | 'hr_admin' | 'none'

/** 役割 × フロー状態から編集可否を判定する */
export function canEdit(role: EvaluationRole, status: FlowStatus): boolean {
  const editMap: Record<EvaluationRole, FlowStatus[]> = {
    self: ['draft', 'goal_set', 'self_eval'],
    primary: ['primary_eval'],
    secondary: ['secondary_eval'],
    confirmer: ['confirming'],
    hr_admin: [],
    none: [],
  }
  return editMap[role]?.includes(status) ?? false
}

/** 役割 × フロー状態から閲覧可否を判定する */
export function canView(role: EvaluationRole, status: FlowStatus): boolean {
  if (role === 'hr_admin') return true
  if (role === 'self') return true
  const viewMap: Partial<Record<EvaluationRole, FlowStatus[]>> = {
    primary: [
      'goal_set',
      'self_eval',
      'self_submitted',
      'primary_eval',
      'primary_submitted',
      'secondary_eval',
      'secondary_submitted',
      'confirming',
      'confirmed',
    ],
    secondary: ['secondary_eval', 'secondary_submitted', 'confirming', 'confirmed'],
    confirmer: ['confirming', 'confirmed'],
    none: [],
  }
  return viewMap[role]?.includes(status) ?? false
}

// ---- テナントテンプレート ----

export type EvaluationTemplate = {
  id: string
  tenant_id: string
  global_template_id: string | null
  name: string
  template_type: EvaluationTemplateType
  description: string | null
  is_active: boolean
  sort_order: number
  copied_from_global_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type EvaluationTemplateItem = {
  id: string
  tenant_id: string
  template_id: string
  axis: EvaluationAxis
  mbo_category: MboCategory | null
  name: string
  description: string | null
  evaluation_focus: string | null
  measurement_method: string | null
  target_grade_note: string | null
  weight: number
  is_custom: boolean
  target_grades: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

export type EvaluationTemplateWithItems = EvaluationTemplate & {
  items: EvaluationTemplateItem[]
}

// ---- 評価期間 ----

export type PeriodStatus =
  | 'preparation'
  | 'goal_setting'
  | 'in_progress'
  | 'self_eval'
  | 'primary_eval'
  | 'secondary_eval'
  | 'confirmed'
  | 'closed'

export type PeriodType = 'first_half' | 'second_half' | 'full_year' | 'quarterly'

export const PERIOD_TYPE_LABELS: Record<PeriodType, string> = {
  first_half: '上半期',
  second_half: '下半期',
  full_year: '通年',
  quarterly: '四半期',
}

export const PERIOD_STATUS_LABELS: Record<PeriodStatus, string> = {
  preparation: '準備中',
  goal_setting: '目標設定期間',
  in_progress: '評価期間中',
  self_eval: '自己評価期間',
  primary_eval: '一次評価期間',
  secondary_eval: '二次評価期間',
  confirmed: '確定済',
  closed: '終了',
}

export type EvaluationPeriod = {
  id: string
  tenant_id: string
  name: string
  fiscal_year: number
  period_type: PeriodType
  start_date: string
  end_date: string
  goal_deadline: string | null
  self_eval_start: string | null
  self_eval_end: string | null
  primary_eval_end: string | null
  secondary_eval_end: string | null
  status: PeriodStatus
  created_at: string
  updated_at: string
}

// ---- 評価シート ----

export type EvaluationSheet = {
  id: string
  tenant_id: string
  employee_id: string
  period_id: string
  template_id: string
  primary_evaluator_id: string | null
  secondary_evaluator_id: string | null
  confirmer_id: string | null
  flow_status: FlowStatus
  final_score: number | null
  final_grade: 'S' | 'A' | 'B' | 'C' | 'D' | null
  is_locked: boolean
  created_at: string
  updated_at: string
}

export type EvaluationGoal = {
  id: string
  tenant_id: string
  sheet_id: string
  item_id: string | null
  goal_title: string
  goal_detail: string | null
  kpi_type: 'quantitative' | 'qualitative'
  kpi_target: string | null
  kpi_unit: string | null
  kpi_achieve_criteria: string | null
  weight: number
  deadline: string | null
  sort_order: number
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

export type EvaluationScore = {
  id: string
  tenant_id: string
  sheet_id: string
  item_id: string | null
  goal_id: string | null
  evaluator_type: 'self' | 'primary' | 'secondary' | 'confirmer'
  score: number | null
  achievement_rate: number | null
  comment: string | null
  evaluated_at: string
  evaluator_id: string
}

export type EvalActionResult = { success: true } | { success: false; error: string }
