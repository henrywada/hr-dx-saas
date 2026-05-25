export type EvaluationTemplateType = 'general' | 'manager' | 'parttime'
export type EvaluationAxis = 'performance' | 'ability' | 'attitude' | 'mbo'
export type MboCategory = 'A' | 'B' | 'C' | 'D'

export const TEMPLATE_TYPE_LABELS: Record<EvaluationTemplateType, string> = {
  general: '一般社員用',
  manager: '管理職用',
  parttime: 'パート用',
}

export const AXIS_LABELS: Record<EvaluationAxis, string> = {
  performance: '業績',
  ability: '能力',
  attitude: '情意',
  mbo: 'MBO目標',
}

export const AXIS_SUBTITLES: Record<EvaluationAxis, string> = {
  performance: '何を達成したか（成果・アウトプット）',
  ability: 'どんな力があるか（スキル・知識・判断力）',
  attitude: 'どう取り組んでいるか（姿勢・行動・プロセス）',
  mbo: '個人目標の達成度（目標管理）',
}

export type GlobalEvaluationTemplate = {
  id: string
  name: string
  template_type: EvaluationTemplateType
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type GlobalEvaluationTemplateItem = {
  id: string
  template_id: string
  axis: EvaluationAxis
  mbo_category: MboCategory | null
  name: string
  description: string | null
  evaluation_focus: string | null
  measurement_method: string | null
  target_grade_note: string | null
  weight: number
  sort_order: number
  created_at: string
}

export type GlobalEvaluationTemplateWithItems = GlobalEvaluationTemplate & {
  items: GlobalEvaluationTemplateItem[]
}

export type GlobalEvalActionResult = { success: true } | { success: false; error: string }
