import type {
  QuestionnaireStatus,
  QuestionWithDetails,
  CreateQuestionInput,
} from '@/features/questionnaire/types'

export type { QuestionnaireStatus, QuestionWithDetails, CreateQuestionInput }

// Echo テンプレート（creator_type='system', purpose='echo'）
export interface EchoTemplate {
  id: string
  title: string
  description: string | null
  status: QuestionnaireStatus
  question_count: number
  created_at: string
  updated_at: string
}

// テンプレート詳細（設問込み）
export interface EchoTemplateDetail extends EchoTemplate {
  questions: QuestionWithDetails[]
}

// テナント Echo 設問セット（creator_type='tenant', purpose='echo'）
export interface TenantEchoQuestionnaire {
  id: string
  title: string
  description: string | null
  status: QuestionnaireStatus
  question_count: number
  created_at: string
  updated_at: string
}

// テンプレート作成入力
export interface CreateEchoTemplateInput {
  title: string
  description?: string
}

// テンプレート更新入力
export interface UpdateEchoTemplateInput {
  title?: string
  description?: string
}
