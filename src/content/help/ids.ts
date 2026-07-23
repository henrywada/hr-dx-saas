/**
 * ヘルプ Markdown の contentId 定数（他画面のモーダルから参照用）
 * 実体は src/content/help/markdown/ のファイル名（拡張子なし）と manual の entry.id に一致させる
 */
export const HELP_CONTENT_IDS = {
  /** 勤怠管理の3つのデータ取得方法（本格マニュアル） */
  ATTENDANCE_THREE_METHODS: 'att-attendance-three-methods',
  ATT_QR: 'att-qr',
  ATT_QR_PERM: 'att-qr-perm',
  ATT_OVERTIME: 'att-overtime',
  ATT_TELEWORK: 'att-telework',
  /** チームコネクト（組織図・社内ディレクトリ閲覧）の使い方 */
  ORG_TEAM_CONNECT: 'org-team-connect-guide',
  /** 私の1on1（従業員向け 受けた1on1履歴・予定確認）の使い方 */
  MY_ONE_ON_ONE: 'oo-my-history',
  /** 1on1支援ダッシュボード（管理職向け）の使い方 */
  ADMIN_ONE_ON_ONE: 'oo-admin-dashboard-guide',
  /** AI人事アシスタント（人事情報集・AI相談）の使い方 */
  HR_ASSISTANT: 'ai-hr-assistant-guide',
  /** 悩み・相談窓口（相談の送信・匿名相談）の使い方 */
  CONSULTATION: 'con-consultation-guide',
  /** 対応が必要な相談（上司向け受信箱）の使い方 */
  CONSULTATION_INBOX: 'con-consultation-inbox-guide',
  /** ストレスチェック結果（本人向け）の見方 */
  STRESS_MY_RESULT: 'stress-my-result',
  /** 感謝・称賛（Kudos）の使い方 */
  KUDOS: 'eng-kudos-guide',
  /** 社員紹介採用（リファラル）の使い方 */
  REFERRAL: 'rec-referral-guide',
  /** マイ推薦一覧（自分の推薦・報奨金確認）の見方 */
  REFERRAL_MY: 'rec-referral-my-guide',
  /** 上司への相談（育成ジャーニー）の使い方 */
  SKILL_JOURNEY_CONSULT: 'car-journey-consult-guide',
  /** キャリア面談（本人向け履歴・上長向け予約・記録）の使い方 */
  CAREER_DISCUSSIONS: 'car-career-discussions-guide',
  /** 労務コンプライアンスダッシュボードの見方 */
  LABOR_COMPLIANCE: 'lc-dashboard-guide',
  /** 36協定 遵守状況ダッシュボードの見方 */
  ANALYSIS_36: 'att-36analysis-guide',
  /** 入荷登録（QRスキャン）の使い方 */
  MYOU_RECEIVING_SCAN: 'myou-receiving-scan-guide',
  /** 出荷登録（QRスキャン）の使い方 */
  MYOU_DELIVERY_SCAN: 'myou-delivery-scan-guide',
  /** 出荷リストの使い方 */
  MYOU_DELIVERY_HISTORY: 'myou-delivery-history-guide',
  /** 在庫一覧の使い方 */
  MYOU_INVENTORY: 'myou-inventory-guide',
  /** トレーサビリティ検索（流通経路上での照会）の使い方 */
  MYOU_TRACEABILITY: 'myou-traceability-guide',
  /** 有効期限監視・アラート管理の使い方 */
  MYOU_EXPIRATION_ALERTS: 'myou-expiration-alerts-guide',
  /** 施工会社（納入先）管理の使い方 */
  MYOU_COMPANIES: 'myou-companies-guide',
} as const

export type HelpContentId = (typeof HELP_CONTENT_IDS)[keyof typeof HELP_CONTENT_IDS]
