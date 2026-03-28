/**
 * Asia/Tokyo タイムゾーンでの日時ユーティリティ
 * Supabase への日時書き込み時に使用する
 */

const TZ = 'Asia/Tokyo'

/**
 * 指定日時（デフォルトは現在）を Asia/Tokyo の ISO 8601 形式で返す
 * 例: 2026-03-18T08:30:00+09:00
 */
export function toJSTISOString(date: Date = new Date()): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = f.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}.000+09:00`
}

/**
 * 契約終了「日」（暦日）の終端を表す timestamptz 用 UTC ISO 文字列
 * 選択日の JST 23:59:59.999 を保存する
 */
export function contractEndDayYmdToUtcIso(ymd: string): string {
  return new Date(`${ymd}T23:59:59.999+09:00`).toISOString()
}

/**
 * 指定日時（デフォルトは現在）を Asia/Tokyo の YYYY-MM-DD で返す
 * 日付のみフィールド用
 */
export function toJSTDateString(date: Date = new Date()): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return f.format(date)
}

/** JST 暦日 YYYY-MM-DD の 00:00 JST を表す瞬間（UTC の ISO 文字列） */
export function jstDayStartUtcIso(dayYmd: string): string {
  return new Date(`${dayYmd}T00:00:00+09:00`).toISOString()
}

/** 翌日 00:00 JST（当日範囲の終端 `<` 用） */
export function jstNextDayStartUtcIso(dayYmd: string): string {
  const start = new Date(`${dayYmd}T00:00:00+09:00`)
  return new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString()
}

/** 指定日時の Asia/Tokyo における YYYY-MM（パルス調査の期間キー用） */
export function getJSTYearMonth(date: Date = new Date()): string {
  return toJSTDateString(date).slice(0, 7)
}

/**
 * YYYY-MM に対する暦上の月末日を YYYY-MM-DD で返す（パルス調査のデフォルト締切用）
 */
export function lastDayOfMonthYmd(yearMonth: string): string {
  const [yStr, mStr] = yearMonth.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return `${yearMonth}-28`
  }
  const lastDay = new Date(y, m, 0).getDate()
  return `${yStr}-${mStr}-${String(lastDay).padStart(2, '0')}`
}

/**
 * ISO 8601 文字列を Asia/Tokyo で YYYY/MM/DD 形式にフォーマット
 * Supabase から取得した日時（UTC）を日本標準時間で表示する
 */
export function formatDateInJST(iso: string): string {
  const d = new Date(iso)
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = f.formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')}`
}

/**
 * ISO 8601 文字列を Asia/Tokyo で日時表示（YYYY/MM/DD HH:mm など）
 * Supabase から取得した日時（UTC）を日本標準時間で表示する
 */
export function formatDateTimeInJST(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ja-JP', { timeZone: TZ })
}

/** timestamptz を Asia/Tokyo の HH:mm（24h）で返す */
export function formatTimeInJSTFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const f = new Intl.DateTimeFormat('ja-JP', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return f.format(d)
}

/**
 * ローカル暦日（YYYY-MM-DD）と時刻（HH:mm または HH:mm:ss）から、
 * ブラウザのローカルタイムゾーンのオフセット付き ISO 8601 を返す（残業申請 API 用）
 */
export function toLocalOffsetIsoFromParts(dateYmd: string, timeHm: string): string {
  const [y, m, d] = dateYmd.split('-').map(Number)
  const tp = timeHm.split(':')
  const hh = Number(tp[0] ?? 0)
  const mm = Number(tp[1] ?? 0)
  const ss = tp.length > 2 ? Number(tp[2] ?? 0) : 0
  const local = new Date(y, (m ?? 1) - 1, d ?? 1, hh, mm, ss)
  if (Number.isNaN(local.getTime())) {
    throw new Error('Invalid date/time')
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  const offMin = -local.getTimezoneOffset()
  const sign = offMin >= 0 ? '+' : '-'
  const abs = Math.abs(offMin)
  const oh = pad(Math.floor(abs / 60))
  const om = pad(abs % 60)
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}:${pad(local.getSeconds())}${sign}${oh}:${om}`
}

/** timestamptz ISO をブラウザローカルの HH:mm に変換（input type="time" の初期値用） */
export function isoTimestamptzToLocalTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
