export type HrLawSource = {
  id: string
  topic: string
  search_query: string
  enabled: boolean
  last_run_at: string | null
  created_at: string
  updated_at?: string | null
  disabled_at?: string | null
  origin?: 'seed' | 'manual' | 'proposal'
}

export type HrLawTopicProposal = {
  id: string
  topic: string
  topic_key: string
  search_query: string
  source: 'chat' | 'mhlw_discover'
  evidence: Record<string, unknown>
  score: number
  status: 'pending' | 'approved' | 'rejected' | 'dismissed'
  reviewed_by: string | null
  reviewed_at: string | null
  created_source_id: string | null
  created_at: string
  updated_at: string
}

export type HrLawDocument = {
  id: string
  source_id: string | null
  title: string
  source_url: string
  summary: string
  theme: string | null
  published_at: string | null
  fetched_at: string
  expires_at: string | null
  status: 'published' | 'disabled' | 'expired'
  topic: string | null
}

export type HrLawRefreshLog = {
  id: string
  started_at: string
  finished_at: string | null
  trigger_type: 'cron' | 'manual'
  source_id: string | null
  source_topic: string | null
  sources_processed: number
  queued: number
  documents_created: number
  documents_skipped: number
  /** この実行で保存した詳細説明の文字数合計 */
  detail_chars: number
  freshness_checked?: number
  documents_updated?: number
  proposals_created?: number
  success: boolean
  error_message: string | null
  errors: string[]
  created_at: string
}

export type RefreshActionResult =
  | {
      ok: true
      documentsCreated: number
      documentsSkipped: number
      errors: string[]
      queued?: number
    }
  | { ok: false; error: string }
