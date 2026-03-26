/** 日本時間の当該日の [startIso, endIsoExclusive)（UTC ISO 文字列） */
export function getJstDateRangeUtc(now = new Date()): { dateStr: string; startIso: string; endIsoExclusive: string } {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const start = new Date(`${dateStr}T00:00:00+09:00`)
  const endIsoExclusive = new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString()
  return { dateStr, startIso: start.toISOString(), endIsoExclusive }
}
