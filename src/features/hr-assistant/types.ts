export type AssistantMode = 'general' | 'labor_calc' | 'comment_review' | 'case_search'

export const ASSISTANT_MODE_LABELS: Record<AssistantMode, string> = {
  general: '汎用相談',
  labor_calc: '労務計算',
  comment_review: 'コメント添削',
  case_search: '類似ケース検索',
}

export const ASSISTANT_MODE_DESCRIPTIONS: Record<AssistantMode, string> = {
  general: '人事・労務・就業規則に関する質問に回答します',
  labor_calc: '残業代・有休消化日数などの計算を支援します',
  comment_review: '評価コメントの添削・改善提案を行います',
  case_search: '過去の類似相談ケースを検索します',
}

export type HrAssistantSession = {
  id: string
  title: string | null
  mode: AssistantMode
  created_at: string
  updated_at: string
}

export type HrAssistantMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode: AssistantMode
  cited_chunk_ids: string[] | null
  metadata: Record<string, unknown>
  created_at: string
}

export type SendMessageResult =
  | {
      ok: true
      sessionId: string
      answer: string
      citations: Citation[]
    }
  | { ok: false; error: string }

export type Citation = {
  title: string
  snippet: string
  /** 法令情報の出典URL（社内資料の場合は undefined） */
  sourceUrl?: string
  /** 法令情報の取得日（YYYY-MM-DD、社内資料の場合は undefined） */
  fetchedAt?: string
}

/** 質問テンプレート（tenant_id が null の行は全テナント共通 seed） */
export type QuestionTemplate = {
  id: string
  tenant_id: string | null
  mode: AssistantMode
  question_text: string
  source: 'seed' | 'mined'
  usage_count: number
  status: 'active' | 'archived'
  created_at: string
}

/** 人事アップデート（hr_law_documents）一覧用 */
export type HrUpdateDocument = {
  id: string
  title: string
  /** 一覧2行用の短い要約 */
  summary: string
  /** モーダル・AI用の詳細説明（情報元を開かなくても足りる量） */
  detail: string | null
  source_url: string
  theme: string | null
  published_at: string | null
  fetched_at: string
  expires_at: string | null
  status: 'published' | 'disabled' | 'expired'
}

export type HrAssistantMainTab = 'updates' | 'assistant'
