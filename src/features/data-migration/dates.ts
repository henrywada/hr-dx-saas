import { parseYyyymmdd } from '@/features/health-check/csv-parse'

/** 日本の会計年度（4月始まり）。YYYY-MM-DD を渡す */
export function japaneseFiscalYear(ymd: string): number {
  const y = Number(ymd.slice(0, 4))
  const m = Number(ymd.slice(5, 7))
  if (!Number.isFinite(y) || !Number.isFinite(m)) return y
  return m >= 4 ? y : y - 1
}

/**
 * YYYYMMDD / YYYY-M-D / YYYY/M/D を YYYY-MM-DD にする。
 */
export function parseFlexibleDate(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const normalized = t.replace(/-/g, '/')
  const slash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized)
  if (slash) {
    const ymd = `${slash[1]}${slash[2].padStart(2, '0')}${slash[3].padStart(2, '0')}`
    return parseYyyymmdd(ymd)
  }
  return parseYyyymmdd(t)
}

/** CSV の性別を従業員フォームの値へ寄せる */
export function mapEmployeeSex(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (['男', '男性', 'male', 'Male', 'M', 'm'].includes(s)) return '男性'
  if (['女', '女性', 'female', 'Female', 'F', 'f'].includes(s)) return '女性'
  return s
}

/** ストレス採点用。女性系以外は male */
export function sexForStressScoring(sex: string | null | undefined): 'male' | 'female' {
  const s = (sex ?? '').trim()
  if (s === 'female' || s === '女' || s === '女性' || s === 'F' || s === 'f') return 'female'
  return 'male'
}
