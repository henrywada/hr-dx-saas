import { createClient } from '@/lib/supabase/server'
import { FEED_PROVIDERS } from './registry'
import { sortFeedItems } from './sort'
import type { FeedItem, RawFeedItem } from './types'
import type { FeedProvider, FeedProviderContext } from './provider'

export const FEED_LIMIT = 6

/** visibleKeys（ui_dashboard_element 由来）でプロバイダをフィルタする。
 * これにより tenant_service 未契約テナントに対してはプロバイダの fetch 自体が呼ばれなくなる。 */
export function filterEnabledProviders(
  providers: FeedProvider[],
  visibleKeys: Set<string> | null
): FeedProvider[] {
  return providers.filter(p => !visibleKeys || visibleKeys.has(`top.feed.${p.key}`))
}

/** raw アイテムに既読状態を反映する純関数 */
export function applyReadState(items: RawFeedItem[], readKeys: Set<string>): FeedItem[] {
  return items.map(item => ({ ...item, isRead: readKeys.has(item.dedupeKey) }))
}

/** Promise.allSettled の結果から表示用アイテム一覧を組み立てる純関数。
 * reject したプロバイダの結果は無視する（graceful degradation）。 */
export function aggregateSettledFeedItems(
  settled: PromiseSettledResult<RawFeedItem[]>[],
  readKeys: Set<string>
): FeedItem[] {
  const rawItems = settled.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
  return sortFeedItems(applyReadState(rawItems, readKeys)).slice(0, FEED_LIMIT)
}

/** dedupeKey の一覧のうち既読済みのものを取得する */
export async function getReadDedupeKeys(
  employeeId: string,
  dedupeKeys: string[]
): Promise<Set<string>> {
  if (dedupeKeys.length === 0) return new Set()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dashboard_feed_read_state')
    .select('dedupe_key')
    .eq('employee_id', employeeId)
    .in('dedupe_key', dedupeKeys)

  if (error || !data) return new Set()
  return new Set(data.map(row => row.dedupe_key as string))
}

export async function getTopFeedItems(
  ctx: FeedProviderContext,
  visibleKeys: Set<string> | null
): Promise<FeedItem[]> {
  const enabledProviders = filterEnabledProviders(FEED_PROVIDERS, visibleKeys)

  const settled = await Promise.allSettled(enabledProviders.map(p => p.fetch(ctx)))
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[dashboard/feed] provider "${enabledProviders[i].key}" failed`, r.reason)
    }
  })

  const dedupeKeys = settled.flatMap(r =>
    r.status === 'fulfilled' ? r.value.map(i => i.dedupeKey) : []
  )
  const readKeys = await getReadDedupeKeys(ctx.employeeId, dedupeKeys)

  return aggregateSettledFeedItems(settled, readKeys)
}
