/** 「全て」表示時の件数上限（新しい順） */
export const LOGIN_LOG_MAX_ROWS = 5000

export const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 年月（YYYY-MM）のみ許可。不正値は null（=全て） */
export function parseYearMonth(raw: unknown): string | null {
  return typeof raw === 'string' && YEAR_MONTH_RE.test(raw) ? raw : null
}

/** テナントID（UUID 形式）のみ許可。不正値は null（=全て） */
export function parseTenantId(raw: unknown): string | null {
  return typeof raw === 'string' && UUID_RE.test(raw) ? raw : null
}

/** JST の当月（YYYY-MM） */
function currentYearMonthJst(now: Date): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 7)
}

/** 指定年月が JST の当月より前か（不正形式は false） */
export function isPastYearMonth(ym: string, now: Date = new Date()): boolean {
  return YEAR_MONTH_RE.test(ym) && ym < currentYearMonthJst(now)
}

/** 表示種別: sessions=Log in/out（既定）, pages=ページ閲覧 */
export type LogView = 'sessions' | 'pages'

/** view クエリ。'pages' のみ許可し、それ以外は既定の 'sessions' */
export function parseLogView(raw: unknown): LogView {
  return raw === 'pages' ? 'pages' : 'sessions'
}
