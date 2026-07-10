import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import type { HrLawSource, HrLawDocument } from './types'

async function isSaasAdmin(): Promise<boolean> {
  const user = await getServerUser()
  return !!user && (user.role === 'supaUser' || user.appRole === 'developer')
}

/** 監視トピック一覧（SaaS管理者専用） */
export async function listHrLawSources(): Promise<HrLawSource[]> {
  if (!(await isSaasAdmin())) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('hr_law_sources')
    .select('id, topic, search_query, enabled, last_run_at, created_at')
    .order('topic', { ascending: true })

  if (error) {
    console.error('[saas-law-knowledge] listHrLawSources', error)
    return []
  }
  return (data ?? []) as HrLawSource[]
}

/** 収集済み文書一覧（新しい順、トピック名を結合。SaaS管理者専用） */
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
