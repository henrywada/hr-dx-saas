/**
 * LINE友だち招待機能の型定義
 */

/** 招待メールの送信状態（一覧フィルタ・列表示用） */
export type FriendInviteMailStatus = '未送信' | '送信済'

/** 友だち招待の送信候補（未連携従業員） */
export interface FriendInviteCandidate {
  /** 従業員ID */
  employeeId: string
  /** auth.users の UUID */
  userId: string
  /** 従業員名 */
  name: string
  /** メールアドレス（取得できない場合は空文字） */
  email: string
  /**
   * 招待メール列の表示値。
   * line_friend_invites に1件でもあれば「送信済」、なければ「未送信」
   */
  inviteMailStatus: FriendInviteMailStatus
}

/** LINE連携状況の集計（SaaS管理者向け） */
export interface LineLinkStats {
  /** 連携済み */
  linked: number
  /** 未連携 */
  unlinked: number
  /** ブロック済み */
  blocked: number
}

/** sendFriendInvites の戻り値 */
export interface SendFriendInvitesResult {
  /** 送信成功件数 */
  sent: number
  /** 送信失敗リスト */
  failed: {
    employeeId: string
    name: string
    reason: string
  }[]
}
