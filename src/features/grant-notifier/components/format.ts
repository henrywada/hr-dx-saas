/**
 * 助成金情報配信の画面で共通に使う表示フォーマット（純粋関数）。
 * 日時は全て Asia/Tokyo で表示する。
 */

/** ISO8601 を「2026/08/07」表記にする。null・不正は「—」 */
export function formatJstDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'medium',
  }).format(date)
}

/** ISO8601 を「2026/08/07 07:00」表記にする。null・不正は「—」 */
export function formatJstDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

/** 金額を「〜570,000円」表記にする。null・0以下は「記載なし」 */
export function formatAmount(amount: number | null): string {
  if (amount === null || amount <= 0) return '記載なし'
  return `〜${amount.toLocaleString('ja-JP')}円`
}

/** 開始〜終了の所要時間を「◯分◯秒」表記にする。終了未確定（実行中）は「—」 */
export function formatDuration(startedAt: string, finishedAt: string | null): string {
  if (!finishedAt) return '—'

  const start = new Date(startedAt).getTime()
  const end = new Date(finishedAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '—'

  const totalSeconds = Math.round((end - start) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`
}
