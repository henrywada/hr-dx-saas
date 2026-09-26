/**
 * mYou トレース照会画面に表示する有効期限を決める
 *
 * 有効期限は出荷登録時に入力する値で、ロット（myou_lots.expiration_date）には常に NULL が入る。
 * そのため照会画面ではロットではなく出荷履歴（myou_delivery_logs）の有効期限を参照する。
 */

interface DeliveryExpirationSource {
  trace_no: string | null
  expiration_date: string | null
}

export interface TraceExpirationDisplay {
  /** 単一の日付を表示できる場合のみ設定（期限切れの色分け判定に使う） */
  date: string | null
  /** 画面に表示する文字列 */
  text: string
}

/**
 * 照会キー（ロット番号または TraceNo）と出荷履歴から、表示する有効期限を返す。
 * - TraceNo で照会した場合: そのTraceNoの出荷の有効期限
 * - ロット番号で照会した場合: 出荷の有効期限がすべて同じならその日付、異なれば履歴の参照を促す
 */
export function getTraceExpirationDisplay(
  history: DeliveryExpirationSource[],
  identifier: string
): TraceExpirationDisplay {
  if (history.length === 0) return { date: null, text: '出荷時に設定されます' }

  const key = identifier.trim()
  const matched = history.find(log => log.trace_no === key)
  if (matched) return toDisplay(matched.expiration_date)

  const dates = Array.from(
    new Set(history.map(log => log.expiration_date).filter((d): d is string => !!d))
  )
  if (dates.length === 0) return { date: null, text: '未設定' }
  if (dates.length === 1) return toDisplay(dates[0])
  return { date: null, text: '出荷ごとに異なります（下の出荷履歴を参照）' }
}

function toDisplay(date: string | null): TraceExpirationDisplay {
  return date ? { date, text: date } : { date: null, text: '未設定' }
}
