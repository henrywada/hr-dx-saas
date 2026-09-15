import type { DocumentListItem } from '@/features/documents/types'

/** 一覧 UI のタグ・日付・金額フィルタ（読み込み済みページにクライアント側適用） */
export type DocumentAlbumFilterState = {
  tagFilter: string
  fromDate: string
  toDate: string
  amountMin: string
  amountMax: string
}

export function filterDocumentListItems(
  items: DocumentListItem[],
  filters: DocumentAlbumFilterState & { filterAmount?: boolean }
): DocumentListItem[] {
  return items.filter(item => {
    if (filters.tagFilter && !item.tags.includes(filters.tagFilter)) {
      return false
    }
    if (filters.fromDate && (!item.contextDate || item.contextDate < filters.fromDate)) {
      return false
    }
    if (filters.toDate && (!item.contextDate || item.contextDate > filters.toDate)) {
      return false
    }
    if (filters.filterAmount) {
      const amount = item.amountYen
      if (filters.amountMin) {
        const min = Number(filters.amountMin)
        if (Number.isFinite(min) && (amount === null || amount < min)) return false
      }
      if (filters.amountMax) {
        const max = Number(filters.amountMax)
        if (Number.isFinite(max) && (amount === null || amount > max)) return false
      }
    }
    return true
  })
}
