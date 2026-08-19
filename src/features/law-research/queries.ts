import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type { ResearchHistoryRow } from './types'

/** 検索履歴の既定取得件数 */
const DEFAULT_HISTORY_LIMIT = 20

/**
 * 自テナントの検索履歴を新しい順に取得する。
 * RLS でテナント分離されるが、追加の tenant_id 条件を保険として付ける。
 */
export async function listResearchHistory(
  limit: number = DEFAULT_HISTORY_LIMIT
): Promise<ResearchHistoryRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tenant_research_queries')
    .select('id, mode, sub_tab, keyword, article, result_count, created_at')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[law-research] listResearchHistory', error)
    return []
  }

  return (data ?? []) as ResearchHistoryRow[]
}
