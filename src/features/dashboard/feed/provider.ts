import type { RawFeedItem } from './types'

export interface FeedProviderContext {
  employeeId: string
  userId: string
  tenantId: string
  divisionId: string | null
  appRole: string | null | undefined
  isManager: boolean
}

export interface FeedProvider {
  /** ui_dashboard_element の element_key サフィックス（例: 'consultation' → top.feed.consultation） */
  key: string
  fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]>
}
