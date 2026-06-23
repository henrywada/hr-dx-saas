// 自動配信ルール（Web検索 → AI要約 → メール配信）型定義

export type ScheduleType = 'weekly' | 'monthly'

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  weekly: '毎週',
  monthly: '毎月',
}

export const DAY_OF_WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 配信ルール */
export interface AutoDistributionRule {
  id: string
  tenant_id: string
  name: string
  search_theme: string
  target_urls: string[] | null
  recipient_emails: string[]
  max_articles: number
  schedule_type: ScheduleType
  schedule_day_of_week: number | null
  schedule_day_of_month: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ExecutionStatus = 'success' | 'failed' | 'partial'
export type TriggeredBy = 'cron' | 'manual'

/** 配信記事1件 */
export interface DistributionArticle {
  published_at: string
  /** AIが記事内容から生成したタイトル（日本語） */
  title: string
  summary: string
  source_url: string
  ai_opinion: string
}

/** 実行履歴 */
export interface AutoDistributionLog {
  id: string
  tenant_id: string
  rule_id: string
  executed_at: string
  status: ExecutionStatus
  article_count: number
  articles: DistributionArticle[]
  error_message: string | null
  triggered_by: TriggeredBy
}

/** ルール作成・更新入力 */
export type UpsertAutoDistributionRuleInput = Omit<
  AutoDistributionRule,
  'id' | 'tenant_id' | 'created_by' | 'created_at' | 'updated_at'
>

/** ルール実行結果 */
export interface ExecuteRuleResult {
  success: boolean
  status: ExecutionStatus
  articleCount: number
  errorMessage?: string
}
