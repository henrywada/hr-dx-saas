import { addMonths, format, parseISO, startOfMonth } from 'date-fns'

/** Asia/Tokyo の当月1日 YYYY-MM-DD */
export function getDefaultYearMonthTokyo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  if (!y || !m) {
    return format(startOfMonth(new Date()), 'yyyy-MM-dd')
  }
  return `${y}-${m}-01`
}

/** クエリ・URL の year_month を API と同じく月初正規化 */
export function parseYearMonthQuery(raw: string | null | undefined): string {
  if (raw == null || raw.trim() === '') {
    return getDefaultYearMonthTokyo()
  }
  const normalized = raw.length === 7 ? `${raw}-01` : raw
  const d = parseISO(normalized)
  if (Number.isNaN(d.getTime())) {
    return getDefaultYearMonthTokyo()
  }
  return format(startOfMonth(d), 'yyyy-MM-dd')
}

export function addMonthsToYearMonth(ymd: string, delta: number): string {
  return format(startOfMonth(addMonths(parseISO(ymd), delta)), 'yyyy-MM-dd')
}
