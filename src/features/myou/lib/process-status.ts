export type ProcessStatus = 'unused' | 'used' | 'alert_ignored'

export const PROCESS_STATUS_VALUES = ['unused', 'used', 'alert_ignored'] as const

/** 編集モーダルで選べる処理ステータス（使用済は出荷リストの使用数で管理するため除外） */
export const PROCESS_STATUS_EDIT_VALUES = ['unused', 'alert_ignored'] as const

const LABELS: Record<ProcessStatus, string> = {
  unused: '未使用',
  used: '使用済',
  alert_ignored: 'アラート無視',
}

/** 処理ステータスの画面表示名 */
export function processStatusLabel(status: ProcessStatus): string {
  return LABELS[status]
}

/** アラート送信対象は未使用のみ */
export function filterUnusedForAlert<T extends { process_status: ProcessStatus }>(rows: T[]): T[] {
  return rows.filter(row => row.process_status === 'unused')
}
