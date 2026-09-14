import { differenceInCalendarDays, parseISO } from 'date-fns'
import { toJSTDateString } from '@/lib/datetime'

/** 放置判定に渡す advice コメント1件分（queries.ts の SELECT 結果を正規化した形） */
export interface AdviceCommentInput {
  commentId: string
  taskGroupId: string
  taskId: string | null
  senderEmployeeId: string
  targetEmployeeId: string
  createdAt: string
}

/** `dashboard_feed_read_state` から取得した既読キー1件分 */
export interface ReadStateInput {
  dedupeKey: string
}

/** 未読かつ閾値日数以上経過した advice */
export interface StaleAdviceItem extends AdviceCommentInput {
  /** 作成日から判定基準日までの JST 暦日差 */
  daysElapsed: number
}

/**
 * `/top` 通知フィード・未読バッジと同じ既読キーを返す。
 * `dashboard_feed_read_state.dedupe_key` と突き合わせるために形式を揃える。
 */
export function toAdviceDedupeKey(commentId: string): string {
  return `task_management:comment:${commentId}`
}

/**
 * 未読かつ作成から `thresholdDays` 日以上経過した advice だけを返す。
 * 日付比較は Asia/Tokyo の暦日（`toJSTDateString`）で行い、
 * ちょうど閾値日数は放置に含める（`task-health.ts` の stale 判定と同じ境界）。
 */
export function computeStaleAdviceItems(
  comments: AdviceCommentInput[],
  readStates: ReadStateInput[],
  thresholdDays: number,
  now: Date
): StaleAdviceItem[] {
  const readKeys = new Set(readStates.map(row => row.dedupeKey))
  const nowYmd = toJSTDateString(now)

  const items: StaleAdviceItem[] = []
  for (const comment of comments) {
    if (readKeys.has(toAdviceDedupeKey(comment.commentId))) continue

    const createdYmd = toJSTDateString(new Date(comment.createdAt))
    const daysElapsed = differenceInCalendarDays(parseISO(nowYmd), parseISO(createdYmd))
    if (daysElapsed < thresholdDays) continue

    items.push({ ...comment, daysElapsed })
  }

  return items
}
