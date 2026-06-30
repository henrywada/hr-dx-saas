import { z } from 'zod'

/** キャリア面談テーマ定数（組み込みデフォルト） */
export const DEFAULT_THEMES = [
  '将来のキャリア志向',
  '異動・昇進希望',
  'スキル開発計画',
  '現在の業務満足度',
  '長期的な目標',
] as const

/** キャリア面談記録 */
export interface CareerDiscussion {
  id: string
  tenant_id: string
  employee_id: string
  conducted_by_employee_id: string
  theme: string
  career_aspiration: string | null
  notes: string | null
  next_date: string | null // 'YYYY-MM-DD'
  evaluation_period_id: string | null
  conducted_at: string // ISO 8601
  created_at: string
}

/** テーマテンプレート */
export interface CareerDiscussionThemeTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

/** 一覧表示用（従業員名・部署名付き） */
export interface CareerDiscussionRow {
  id: string
  employee_id: string
  employee_name: string
  conducted_by_employee_id: string
  conducted_by_name: string
  department_name: string | null
  theme: string
  career_aspiration: string | null
  notes: string | null
  next_date: string | null
  evaluation_period_id: string | null
  conducted_at: string
  one_on_one_session_id: string | null
  linked_one_on_one_theme: string | null
}

/** 評価期間（任意選択用、軽量版） */
export interface EvaluationPeriodOption {
  id: string
  fiscal_year: number
  period_type: string
}

/** 対象従業員セレクト用 */
export interface CareerDiscussionEmployeeOption {
  id: string
  name: string
  department_name: string | null
}

export type CareerAppointmentStatus = 'scheduled' | 'completed' | 'cancelled'

/** キャリア面談予約（CR-S1） */
export interface CareerAppointmentRow {
  id: string
  employee_id: string
  employee_name: string
  scheduled_by_employee_id: string
  scheduled_by_name: string
  department_name: string | null
  theme: string | null
  scheduled_at: string
  status: CareerAppointmentStatus
  notes: string | null
}

/** 未実施リマインダー対象（1on1 ReminderBadge と同方針） */
export interface CareerOverdueEmployee {
  employee_id: string
  employee_name: string
  department_name: string | null
  last_discussion_at: string | null
  days_overdue: number
}

/**
 * キャリア面談を記録・管理できる権限かどうかを判定する（1on1のcanConductOneOnOneと同じ方針）。
 * テナント管理者ロール（employee 以外）または上長フラグ（is_manager）を持つユーザを許可する。
 */
export function canConductCareerDiscussion(
  appRole: string | null | undefined,
  isManager?: boolean | null
): boolean {
  return Boolean(isManager) || (appRole != null && appRole !== 'employee')
}

/**
 * `'use server'` ファイルは async 関数以外を export できないため、
 * zod schema はここ（types.ts）に定義する（条件確認チェックインなど直近機能と同じ理由）。
 */
export const createCareerDiscussionSchema = z.object({
  employeeId: z.string().uuid(),
  theme: z.string().min(1).max(200),
  careerAspiration: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  nextDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  evaluationPeriodId: z.string().uuid().optional(),
  conductedAt: z.string().datetime().optional(),
  oneOnOneSessionId: z.string().uuid().optional(),
})

export type CreateCareerDiscussionInput = z.infer<typeof createCareerDiscussionSchema>

export const updateCareerDiscussionSchema = z.object({
  id: z.string().uuid(),
  theme: z.string().min(1).max(200),
  careerAspiration: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  nextDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  evaluationPeriodId: z.string().uuid().optional().nullable(),
  conductedAt: z.string().datetime().optional(),
})

export type UpdateCareerDiscussionInput = z.infer<typeof updateCareerDiscussionSchema>

export const scheduleAppointmentSchema = z.object({
  employeeId: z.string().uuid(),
  theme: z.string().max(200).optional(),
  scheduledAt: z.string().datetime({ message: '予約日時を入力してください' }),
  notes: z.string().max(500).optional(),
})

export type ScheduleAppointmentInput = z.infer<typeof scheduleAppointmentSchema>

export const updateAppointmentSchema = scheduleAppointmentSchema.extend({
  id: z.string().uuid(),
})

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>

export const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999),
})
