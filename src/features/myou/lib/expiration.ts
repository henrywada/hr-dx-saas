/**
 * mYou 有効期限の残日数計算（JST 基準）
 *
 * UTC パースとローカルパースが混在すると JST では残日数が ±1 日ずれるため、
 * 日付文字列（YYYY-MM-DD）を必ず JST の 0 時として解釈し、
 * 「今日（JST）の 0 時」との暦日差分から残日数を求める。
 */
import { toJSTDateString } from '@/lib/datetime'

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * 有効期限までの残日数を返す。
 * 期限当日は 0、期限切れは負数、未設定・不正な日付は null。
 * `now` はテスト用に注入可能（省略時は現在時刻）。
 */
export function getDaysUntilExpiration(
  expirationDate: string | null,
  now: Date = new Date()
): number | null {
  if (!expirationDate) return null
  const expirationMs = new Date(`${expirationDate}T00:00:00+09:00`).getTime()
  if (Number.isNaN(expirationMs)) return null
  const todayStartMs = new Date(`${toJSTDateString(now)}T00:00:00+09:00`).getTime()
  return Math.round((expirationMs - todayStartMs) / MS_PER_DAY)
}
