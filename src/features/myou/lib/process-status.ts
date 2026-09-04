export type ProcessStatus = 'unused' | 'used' | 'alert_ignored' | 'sent'

export const PROCESS_STATUS_VALUES = ['unused', 'used', 'alert_ignored', 'sent'] as const

/**
 * 編集モーダルで選べる処理ステータス。
 * used（出荷リストの使用数で管理）と sent（アラート送信成功時に自動設定）は手動選択の対象外
 */
export const PROCESS_STATUS_EDIT_VALUES = ['unused', 'alert_ignored'] as const

const LABELS: Record<ProcessStatus, string> = {
  unused: '未使用',
  used: '使用済',
  alert_ignored: 'アラート無視',
  sent: '送信済',
}

/** 処理ステータスの画面表示名 */
export function processStatusLabel(status: ProcessStatus): string {
  return LABELS[status]
}

/** アラート送信対象は未使用のみ */
export function filterUnusedForAlert<T extends { process_status: ProcessStatus }>(rows: T[]): T[] {
  return rows.filter(row => row.process_status === 'unused')
}
