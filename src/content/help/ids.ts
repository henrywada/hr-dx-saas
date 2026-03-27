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
} as const;

export type HelpContentId = (typeof HELP_CONTENT_IDS)[keyof typeof HELP_CONTENT_IDS];
