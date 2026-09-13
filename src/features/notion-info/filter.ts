import type { NotionInfoItem } from './types'

/**
 * 募集期限が今日より前の助成金を除外する。
 * deadline が null・空文字、または deadline >= todayYmd の行を残す（YYYY-MM-DD 文字列比較）。
 */
export function filterExpiredGrants(
  items: NotionInfoItem[],
  todayYmd: string
): NotionInfoItem[] {
  return items.filter(
    item =>
      item.deadline == null ||
      item.deadline === '' ||
      item.deadline >= todayYmd
  )
}

/**
 * 収集日時（collectedAt）の降順でソートする。null は末尾。
 * 元配列は変更しない。
 */
export function sortByCollectedAtDesc(
  items: NotionInfoItem[]
): NotionInfoItem[] {
  return [...items].sort((a, b) => {
    if (a.collectedAt == null && b.collectedAt == null) return 0
    if (a.collectedAt == null) return 1
    if (b.collectedAt == null) return -1
    return b.collectedAt.localeCompare(a.collectedAt)
  })
}
