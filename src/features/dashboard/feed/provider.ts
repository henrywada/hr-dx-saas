import type { RawFeedItem } from './types'
import type { AppUser } from '@/types/auth'

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
  /** 件数上限を持たないクエリを書かないこと。PostgREST 1000行上限のサイレント切り捨て・
   * 共有read_state（dedupeKeyの既読管理）の肥大化・/top の表示枠占有を招く。 */
  fetch(ctx: FeedProviderContext): Promise<RawFeedItem[]>
}

/**
 * AppUser から FeedProviderContext を組み立てる。未ログインなら null。
 * employee_id を持たない（人事DB未紐付けの）ユーザーでも、個人非依存のプロバイダ
 * （人事お知らせ等）は表示できるよう、employee_id 欠如だけではフィード全体を止めない。
 */
export function buildFeedProviderContext(user: AppUser | null): FeedProviderContext | null {
  if (!user) return null
  return {
    employeeId: user.employee_id ?? '',
    userId: user.id,
    tenantId: user.tenant_id ?? '',
    divisionId: user.division_id ?? null,
    appRole: user.appRole,
    isManager: Boolean(user.is_manager),
  }
}
