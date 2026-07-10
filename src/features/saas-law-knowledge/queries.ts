import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  HrLawSource,
  HrLawDocument,
  HrLawRefreshLog,
  HrLawTopicProposal,
} from './types'

async function isSaasAdmin(): Promise<boolean> {
  const user = await getServerUser()
  return !!user && (user.role === 'supaUser' || user.appRole === 'developer')
}

/** 監視トピック一覧（無効含む。有効を先に） */
export async function listHrLawSources(): Promise<HrLawSource[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('hr_law_sources')
    .select(
      'id, topic, search_query, enabled, last_run_at, created_at, updated_at, disabled_at, origin'
    )
    .order('enabled', { ascending: false })
    .order('topic', { ascending: true })

  if (error) {
    console.error('[saas-law-knowledge] listHrLawSources', error)
    return []
  }
  return (data ?? []) as HrLawSource[]
}

/** トピック候補（pending 優先） */
export async function listHrLawTopicProposals(): Promise<HrLawTopicProposal[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('hr_law_topic_proposals')
    .select(
      'id, topic, topic_key, search_query, source, evidence, score, status, reviewed_by, reviewed_at, created_source_id, created_at, updated_at'
    )
    .in('status', ['pending', 'approved', 'rejected'])
    .order('status', { ascending: true })
    .order('score', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[saas-law-knowledge] listHrLawTopicProposals', error)
    return []
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    evidence: row.evidence && typeof row.evidence === 'object' ? row.evidence : {},
  })) as HrLawTopicProposal[]
}

/** 収集済み文書一覧 */
export async function listHrLawDocuments(): Promise<HrLawDocument[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('hr_law_documents')
    .select(
      'id, source_id, title, source_url, summary, theme, published_at, fetched_at, expires_at, status, hr_law_sources(topic)'
    )
    .order('fetched_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[saas-law-knowledge] listHrLawDocuments', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    source_id: row.source_id,
    title: row.title,
    source_url: row.source_url,
    summary: row.summary,
    theme: row.theme ?? null,
    published_at: row.published_at,
    fetched_at: row.fetched_at,
    expires_at: row.expires_at ?? null,
    status: row.status,
    topic: row.hr_law_sources?.topic ?? null,
  })) as HrLawDocument[]
}

/** クロールキュー残件数 */
export async function countPendingCrawlQueue(): Promise<number> {
  if (!(await isSaasAdmin())) return 0
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('hr_law_crawl_queue')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (error) {
    console.error('[saas-law-knowledge] countPendingCrawlQueue', error)
    return 0
  }
  return count ?? 0
}

/** 収集実施ログ（日時降順） */
export async function listHrLawRefreshLogs(): Promise<HrLawRefreshLog[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('hr_law_refresh_logs')
    .select(
      'id, started_at, finished_at, trigger_type, source_id, source_topic, sources_processed, queued, documents_created, documents_skipped, detail_chars, freshness_checked, documents_updated, proposals_created, success, error_message, errors, created_at'
    )
    .order('started_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[saas-law-knowledge] listHrLawRefreshLogs', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    errors: Array.isArray(row.errors) ? row.errors : [],
  })) as HrLawRefreshLog[]
}
