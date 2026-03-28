/**
 * ISO 時刻文字列を Asia/Tokyo の暦日 YYYY-MM-DD に変換（勤怠 record_date 用）
 */
export function jstDateYmdFromIso(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/** record_date YYYY-MM-DD から overtime_monthly_stats.period_month 用の月初日 */
export function periodMonthFirstDay(recordDateYmd: string): string {
  return `${recordDateYmd.slice(0, 7)}-01`
}

/** JST の YYYY-MM-DD について、その日 00:00 JST の瞬間を UTC ISO で返す（telework_sessions の日範囲クエリ用） */
export function jstDayStartUtcIsoFromYmd(dayYmd: string): string {
  return new Date(`${dayYmd}T00:00:00+09:00`).toISOString()
}

/** 翌 JST 日の 00:00 の UTC ISO（当日範囲の終端 `<` 用） */
export function jstNextDayStartUtcIsoFromYmd(dayYmd: string): string {
  const start = new Date(`${dayYmd}T00:00:00+09:00`)
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

function tsMs(s: string | null | undefined): number | null {
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? null : t
}

/** より早い ISO 時刻（null は無視） */
export function earlierIso(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const ma = tsMs(a ?? null)
  const mb = tsMs(b ?? null)
  if (ma === null) return b ?? null
  if (mb === null) return a ?? null
  return ma <= mb ? (a as string) : (b as string)
}

/** より遅い ISO 時刻 */
export function laterIso(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const ma = tsMs(a ?? null)
  const mb = tsMs(b ?? null)
  if (ma === null) return b ?? null
  if (mb === null) return a ?? null
  return ma >= mb ? (a as string) : (b as string)
}
