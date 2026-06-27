// src/features/consultation/types.ts

export type ConsultationCategory =
  | 'harassment'
  | 'mental_health'
  | 'workload'
  | 'interpersonal'
  | 'other'

export type ConsultationStatus = 'open' | 'in_progress' | 'resolved'

export interface Consultation {
  id: string
  tenant_id: string
  employee_id: string
  is_anonymous: boolean
  category: ConsultationCategory
  body: string
  status: ConsultationStatus
  assigned_to: string | null
  created_at: string
}

export interface ConsultationReply {
  id: string
  consultation_id: string
  author_employee_id: string
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
  created_at: string
}

export interface ConsultationThread {
  consultation: Consultation
  replies: ConsultationReply[]
}
