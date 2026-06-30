/**
 * 勤怠実績 CSV（クライアント・サーバ共用）パース・時刻解釈
 * 日付・時刻は原則 Asia/Tokyo（+09:00）として解釈
 *
 * ダウンロード用テンプレート: `public/doc/overtime/work_time_records_template.csv`（`docs/overtime/work_time_records_template.csv` と同一内容を維持）
 */

export const WORK_TIME_CSV_TEMPLATE_HEADERS = [
  'employee_number',
  'record_date',
  'start_time',
  'end_time',
  'is_holiday',
] as const

export const WORK_TIME_CSV_REQUIRED_HEADERS = [
  'employee_number',
  'record_date',
  'start_time',
  'end_time',
] as const

export type WorkTimeCsvHeader = (typeof WORK_TIME_CSV_TEMPLATE_HEADERS)[number]

/** BOM 除去 */
export function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '')
}

/** ヘッダー行を正規化（小文字・trim） */
export function normalizeHeaderCell(s: string): string {
  return s.trim().toLowerCase()
}

/** 暦日として妥当か（UTC で検証しタイムゾーンずれを避ける） */
function isValidCalendarYmd(y: number, mo: number, d: number): boolean {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

/**
 * record_date を DB 用 YYYY-MM-DD に正規化する。
 * 受け入れ: YYYY-MM-DD、YYYY/MM/DD（月日は 1〜2 桁。全角スラッシュ可）
 */
export function normalizeRecordDateToYmd(raw: string): string | null {
  const s = raw.trim().replace(/\uFF0F/g, '/')
  const hyphen = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (hyphen) {
    const y = parseInt(hyphen[1], 10)
    const mo = parseInt(hyphen[2], 10)
    const d = parseInt(hyphen[3], 10)
    return isValidCalendarYmd(y, mo, d) ? s : null
  }
  const slash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s)
  if (slash) {
    const y = parseInt(slash[1], 10)
    const mo = parseInt(slash[2], 10)
    const d = parseInt(slash[3], 10)
    if (!isValidCalendarYmd(y, mo, d)) return null
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return null
}

/**
 * record_date と時刻文字列から timestamptz 用 ISO を生成（DB は timestamptz）
 */
export function parseFlexibleJstTime(recordDateYmd: string, timeField: string): string | null {
  const t = timeField.trim()
  if (!t) return null

  const ymd = normalizeRecordDateToYmd(recordDateYmd)
  if (!ymd) return null

  // 既にオフセットまたは Z 付き
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(t)) {
    const d = new Date(t)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  if (t.includes('T')) {
    const withZone = /[+-]\d{2}:?\d{2}$/.test(t) ? t : `${t}+09:00`
    const d = new Date(withZone)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }

  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(t)
  if (!m) return null
  const hh = Math.min(23, parseInt(m[1], 10))
  const mm = Math.min(59, parseInt(m[2], 10))
  const ss = m[3] != null ? Math.min(59, parseInt(m[3], 10)) : 0
  const isoLocal = `${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}+09:00`
  const d = new Date(isoLocal)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** 暦日 YYYY-MM-DD に 1 日加算 */
export function addOneCalendarDayYmd(ymd: string): string | null {
  const normalized = normalizeRecordDateToYmd(ymd.trim())
  if (!normalized) return null
  const [y, mo, d] = normalized.split('-').map(v => parseInt(v, 10))
  const dt = new Date(Date.UTC(y, mo - 1, d + 1))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

/**
 * 出勤・退勤時刻を ISO に解決する。
 * 同一 record_date 上で退勤 < 出勤の場合は深夜跨ぎ（翌日退勤）として解釈する。
 */
export function resolveWorkPeriodTimes(
  recordDateRaw: string,
  startTimeField: string,
  endTimeField: string,
): { startIso: string | null; endIso: string | null } {
  const ymd = normalizeRecordDateToYmd(recordDateRaw.trim())
  if (!ymd) return { startIso: null, endIso: null }

  const startIso = parseFlexibleJstTime(ymd, startTimeField)
  if (!startIso) return { startIso: null, endIso: null }

  let endIso = parseFlexibleJstTime(ymd, endTimeField)
  if (!endIso) return { startIso, endIso: null }

  if (minutesBetween(startIso, endIso) < 0) {
    const nextYmd = addOneCalendarDayYmd(ymd)
    if (nextYmd) {
      const nextEndIso = parseFlexibleJstTime(nextYmd, endTimeField)
      if (nextEndIso && minutesBetween(startIso, nextEndIso) >= 0) {
        endIso = nextEndIso
      }
    }
  }

  return { startIso, endIso }
}

export function minutesBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime()
  const b = new Date(endIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return -1
  return Math.round((b - a) / 60_000)
}

export function parseHolidayCell(raw: string | undefined): boolean {
  if (raw == null || String(raw).trim() === '') return false
  const v = String(raw).trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes' || v === 'はい'
}

/** 1行目に必須ヘッダーが含まれるか（エンコーディング判定用） */
export function workTimeCsvHasRequiredHeaders(text: string): boolean {
  const firstLine = text.split(/\r?\n/).find(line => line.trim().length > 0) ?? ''
  const fields = firstLine.split(',').map(cell => normalizeHeaderCell(cell.replace(/^"|"$/g, '')))
  return WORK_TIME_CSV_REQUIRED_HEADERS.every(h => fields.includes(h))
}

/**
 * 勤怠CSVのバイト列をテキストにデコードする（UTF-8 → Shift_JIS フォールバック）
 */
export function decodeWorkTimeCsvBytes(bytes: ArrayBuffer): {
  text: string
  encoding: 'utf-8' | 'shift_jis'
} {
  const utf8Text = stripBom(new TextDecoder('utf-8').decode(bytes))
  if (workTimeCsvHasRequiredHeaders(utf8Text)) {
    return { text: utf8Text, encoding: 'utf-8' }
  }

  try {
    const sjisText = stripBom(new TextDecoder('shift-jis').decode(bytes))
    if (workTimeCsvHasRequiredHeaders(sjisText)) {
      return { text: sjisText, encoding: 'shift_jis' }
    }
  } catch {
    // shift-jis 非対応環境では UTF-8 結果を返す
  }

  return { text: utf8Text, encoding: 'utf-8' }
}
