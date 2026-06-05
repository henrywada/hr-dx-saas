// 360度評価専用の型定義

export type ReviewCampaignStatus = 'draft' | 'open' | 'closed'

export type ReviewerType = 'superior' | 'peer' | 'subordinate' | 'self'

export type QuestionCategory =
  | 'leadership'
  | 'communication'
  | 'execution'
  | 'collaboration'
  | 'development'

export const REVIEWER_TYPE_LABELS: Record<ReviewerType, string> = {
  superior: '上司',
  peer: '同僚',
  subordinate: '部下',
  self: '自己',
}

export const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  leadership: 'リーダーシップ',
  communication: 'コミュニケーション',
  execution: '実行力',
  collaboration: '協調性',
  development: '育成・成長支援',
}

export const CAMPAIGN_STATUS_LABELS: Record<ReviewCampaignStatus, string> = {
  draft: '下書き',
  open: '回答受付中',
  closed: 'クローズ済',
}

export interface Review360Campaign {
  id: string
  tenant_id: string
  name: string
  description: string | null
  period_id: string | null
  deadline: string
  status: ReviewCampaignStatus
  is_anonymous: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Review360Subject {
  id: string
  campaign_id: string
  tenant_id: string
  employee_id: string
}

export interface Review360Reviewer {
  id: string
  subject_id: string
  tenant_id: string
  reviewer_employee_id: string
  reviewer_type: ReviewerType
  is_anonymous: boolean
  submitted_at: string | null
  created_at: string
}

export interface Review360Question {
  id: string
  campaign_id: string
  tenant_id: string
  question_text: string
  category: QuestionCategory
  sort_order: number
  created_at: string
}

export interface Review360Response {
  id: string
  reviewer_id: string
  question_id: string
  tenant_id: string
  score: number | null
  comment: string | null
  created_at: string
}

// ---- 集計・表示用の複合型 ----

export interface ReviewerWithStatus extends Review360Reviewer {
  reviewer_name: string
  department_name: string | null
}

export interface SubjectWithReviewers extends Review360Subject {
  employee_name: string
  department_name: string | null
  reviewers: ReviewerWithStatus[]
  responded_count: number
  total_count: number
}

export interface CampaignDetail extends Review360Campaign {
  subjects: SubjectWithReviewers[]
  questions: Review360Question[]
}

export interface QuestionResult {
  question_id: string
  question_text: string
  category: QuestionCategory
  avg_all: number
  avg_by_type: Partial<Record<ReviewerType, number>>
  comments: string[]
}

export interface FeedbackReportData {
  subject_id: string
  employee_name: string
  department_name: string | null
  question_results: QuestionResult[]
  strengths: QuestionResult[]
  improvements: QuestionResult[]
  total_reviewers: number
  responded_count: number
}

export interface PendingReviewItem {
  reviewer_id: string
  campaign_name: string
  subject_name: string
  deadline: string
  is_anonymous: boolean
  question_count: number
  answered_count: number
}

// ---- フォーム入力型 ----

export interface CampaignFormInput {
  name: string
  description: string
  period_id: string
  deadline: string
  is_anonymous: boolean
}

export interface QuestionInput {
  id?: string
  question_text: string
  category: QuestionCategory
  sort_order: number
}

export interface ReviewerInput {
  reviewer_employee_id: string
  reviewer_type: ReviewerType
  is_anonymous: boolean
}

export interface ResponseInput {
  question_id: string
  score: number | null
  comment: string
}

export type ActionResult = { success: true } | { success: false; error: string }
