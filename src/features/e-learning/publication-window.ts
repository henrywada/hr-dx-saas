import type { ElCourse } from './types'

/** 日本時間での今日を YYYY-MM-DD で返す（公開日との比較用） */
export function todayInTokyoYmd(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  const d = parts.find(p => p.type === 'day')?.value
  if (!y || !m || !d) throw new Error('todayInTokyoYmd: invalid date parts')
  return `${y}-${m}-${d}`
}

export function hasPublicationDates(
  course: Pick<ElCourse, 'published_start_date' | 'published_end_date'>
): boolean {
  return !!(course.published_start_date || course.published_end_date)
}

function formatYmdJa(isoYmd: string): string {
  return new Date(`${isoYmd}T12:00:00+09:00`).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

/** 公開中かつ開始日・終了日のいずれかが入っているときのみ文言を返す */
export function formatPublicationRangeJa(
  course: Pick<ElCourse, 'status' | 'published_start_date' | 'published_end_date'>
): string | null {
  if (course.status !== 'published' || !hasPublicationDates(course)) return null
  const s = course.published_start_date
  const e = course.published_end_date
  if (s && e) return `開始日 ${formatYmdJa(s)} ～ 終了日 ${formatYmdJa(e)}`
  if (s) return `開始日 ${formatYmdJa(s)} ～`
  if (e) return `～ 終了日 ${formatYmdJa(e)}`
  return null
}

/**
 * 受講画面へ入れるか。公開中で日付未設定なら常に可。
 * 修了済み（assignment.completed_at あり）は復習のため期間外でも可。
 */
export function canAccessCourseViewer(
  course: Pick<ElCourse, 'status' | 'published_start_date' | 'published_end_date'>,
  assignmentCompletedAt: string | null
): boolean {
  if (course.status !== 'published') return false
  if (!hasPublicationDates(course)) return true
  if (assignmentCompletedAt) return true
  const today = todayInTokyoYmd()
  if (course.published_start_date && today < course.published_start_date) return false
  if (course.published_end_date && today > course.published_end_date) return false
  return true
}
