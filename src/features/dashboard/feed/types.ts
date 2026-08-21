/** パネル上の区分。system_notice=システムからの通知、action_prompt=アクション誘導 */
export type FeedItemKind = 'system_notice' | 'action_prompt'

export type FeedItemSeverity = 'critical' | 'warning' | 'action' | 'info'

export type FeedItemCategory =
  | 'hr_announcement'
  | 'health_check'
  | 'e_learning'
  | 'one_on_one'
  | 'career_discussion'
  | 'overtime_compliance'
  | 'consultation'
  | 'kudos'
  | 'questionnaire'
  | 'lifecycle'

/** 各プロバイダが生成する正規化済み通知アイテム */
export interface FeedItem {
  /** プロバイダが決定する安定キー（read-state の主キーにもそのまま使う） */
  dedupeKey: string
  kind: FeedItemKind
  category: FeedItemCategory
  severity: FeedItemSeverity
  title: string
  body: string | null
  actionLabel: string | null
  href: string | null
  /** 表示・ソート用の発生/更新日時（ISO 8601） */
  occurredAt: string
  /** 期限がある場合のみ（YYYY-MM-DD、toJSTDateString 準拠） */
  dueDate: string | null
  /**
   * 既読トグルを表示してよいか。dedupeKey が「件数集計」等の非個体キー
   * （例: consultation:pending）の場合、一度既読にすると新着が発生しても
   * 二度と未読へ戻せなくなるため false にする。個体単位で安定したキー
   * （announcement:{id} 等）を持つアイテムのみ true にすること。
   */
  dismissible: boolean
  isRead: boolean
}

/** read-state 反映前のプロバイダ出力（isRead はクエリ集約層が付与する） */
export type RawFeedItem = Omit<FeedItem, 'isRead'>
