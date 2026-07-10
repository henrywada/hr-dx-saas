export type HrLawSource = {
  id: string
  topic: string
  search_query: string
  enabled: boolean
  last_run_at: string | null
  created_at: string
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

export type RefreshActionResult =
  | {
      ok: true
      documentsCreated: number
      documentsSkipped: number
      errors: string[]
      queued?: number
    }
  | { ok: false; error: string }
