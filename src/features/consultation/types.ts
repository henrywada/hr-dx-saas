// src/features/consultation/types.ts

import { z } from 'zod'

export type ConsultationCategory =
  | 'harassment'
  | 'mental_health'
  | 'workload'
  | 'interpersonal'
  | 'other'

export type ConsultationStatus = 'open' | 'in_progress' | 'resolved'

/** 相談の宛先区分。manager のときのみ target_employee_id が必須 */
export type ConsultationTargetType =
  | 'medical_staff'
  | 'hr'
  | 'hr_manager'
  | 'manager'
  | 'hsc'
  | 'other_any'

export interface Consultation {
  id: string
  tenant_id: string
  /** 匿名相談を対応者が閲覧する場合は null（表示層への実名漏洩防止、queries.ts 参照） */
  employee_id: string | null
  is_anonymous: boolean
  category: ConsultationCategory
  body: string
  status: ConsultationStatus
  assigned_to: string | null
  target_type: ConsultationTargetType
  /** target_type='manager' のときのみ非null（指名された上司の employees.id） */
  target_employee_id: string | null
  /** 対応を宣言（claim）した職員の employees.id。null は未対応 */
  claimed_by: string | null
  claimed_at: string | null
  created_at: string
}

export interface ConsultationReply {
  id: string
  consultation_id: string
  /** 匿名相談を対応者が閲覧する場合、相談者本人の返信は null（表示層への実名漏洩防止） */
  author_employee_id: string | null
  is_staff_reply: boolean
  body: string
  created_at: string
}

/** 本人向け一覧の1行 */
export interface ConsultationListItem {
  id: string
  category: ConsultationCategory
  status: ConsultationStatus
  created_at: string
}

/** 対応者向けキューの1行。display_name は匿名時のマスク後の表示名 */
export interface ConsultationQueueItem {
  id: string
  category: ConsultationCategory
  status: ConsultationStatus
  is_anonymous: boolean
  employee_name: string | null
  display_name: string
  /** 対応を宣言した職員の employees.id。null は未対応 */
  claimed_by: string | null
  created_at: string
}

export interface ConsultationThread {
  consultation: Consultation
  replies: ConsultationReply[]
}

/** 「上司」宛先選択用の候補（employees.is_manager = true の全社プール） */
export interface EligibleManager {
  id: string
  name: string
}

/**
 * 相談送信フォームの入力検証スキーマ。
 * Next.js の 'use server' ファイルは async 関数以外を export できないため、
 * actions.ts ではなくこちらに定義する。
 */
export const submitConsultationSchema = z
  .object({
    category: z.enum(['harassment', 'mental_health', 'workload', 'interpersonal', 'other']),
    body: z.string().min(1).max(2000),
    isAnonymous: z.boolean(),
    targetType: z.enum(['medical_staff', 'hr', 'hr_manager', 'manager', 'hsc', 'other_any']),
    targetEmployeeId: z.string().uuid().optional(),
  })
  .refine(data => (data.targetType === 'manager') === (data.targetEmployeeId !== undefined), {
    message: 'targetType が manager の場合のみ targetEmployeeId が必須です',
    path: ['targetEmployeeId'],
  })

export type SubmitConsultationInput = z.infer<typeof submitConsultationSchema>
