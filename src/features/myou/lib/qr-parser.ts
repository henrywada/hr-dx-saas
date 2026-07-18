/**
 * mYou 製品ラベルQRコードのペイロード処理
 *
 * ペイロード形式: 「SERIAL:<シリアル番号>,EXP:<YYYY-MM-DD>」
 * 例: SERIAL:MS-20260707-0001,EXP:2026-12-31
 */

export interface ParsedQrContent {
  serial: string
  expiration: string
}

/**
 * QRコードの読み取りテキストを解析してシリアル番号と有効期限を取り出す。
 * 形式が合わない場合は全文をシリアル番号として扱う（手入力・旧ラベル互換）。
 */
export function parseQrContent(text: string): ParsedQrContent {
  const parts = text.split(',')
  let serial = ''
  let expiration = ''

  parts.forEach(part => {
    const separatorIndex = part.indexOf(':')
    if (separatorIndex === -1) return
    const key = part.slice(0, separatorIndex).trim().toUpperCase()
    const value = part.slice(separatorIndex + 1).trim()
    if (key === 'SERIAL') serial = value
    if (key === 'EXP') expiration = value
  })

  if (!serial) {
    return { serial: text.trim(), expiration: '' }
  }
  return { serial, expiration }
}

/** シリアル番号と有効期限からQRペイロード文字列を組み立てる */
export function buildQrPayload(serial: string, expiration: string): string {
  return `SERIAL:${serial},EXP:${expiration}`
}

/** シリアル番号の接頭辞（製品セルフィール MS 由来） */
export const SERIAL_PREFIX = 'MS'

/**
 * 発行日とテナント内の当日通番からシリアル番号を組み立てる。
 * 形式: MS-YYYYMMDD-NNNN（例: MS-20260707-0001）
 */
export function buildSerialNumber(dateYmd: string, sequence: number): string {
  const compactDate = dateYmd.replaceAll('-', '')
  return `${SERIAL_PREFIX}-${compactDate}-${String(sequence).padStart(4, '0')}`
}

/**
 * 当日発行済みシリアル番号の一覧から最大通番を求める（該当なしは 0）。
 * 文字列の辞書順では通番が5桁（10000〜）になった時点で大小を誤るため、
 * 必ず数値に変換してから比較する。
 */
export function getMaxSerialSequence(serials: string[], dateYmd: string): number {
  return serials.reduce((max, serial) => {
    const sequence = extractSerialSequence(serial, dateYmd)
    return sequence !== null && sequence > max ? sequence : max
  }, 0)
}

/**
 * 既存シリアル番号から当日通番を取り出す。
 * 形式に合わない場合は null を返す。
 */
export function extractSerialSequence(serial: string, dateYmd: string): number | null {
  const compactDate = dateYmd.replaceAll('-', '')
  const pattern = new RegExp(`^${SERIAL_PREFIX}-${compactDate}-(\\d{4,})$`)
  const match = serial.match(pattern)
  if (!match) return null
  const sequence = Number.parseInt(match[1], 10)
  return Number.isNaN(sequence) ? null : sequence
}

/**
 * トレーサビリティQR用の当日通番文字列を組み立てる（接頭辞なし）。
 * 形式: YYYYMMDD-NNNN（例: 20260718-0001）
 */
export function buildTraceNo(dateYmd: string, sequence: number): string {
  const compactDate = dateYmd.replaceAll('-', '')
  return `${compactDate}-${String(sequence).padStart(4, '0')}`
}

/**
 * 既存TraceNo文字列から当日通番を取り出す。
 * 形式に合わない場合は null を返す。
 */
export function extractTraceSequence(traceNo: string, dateYmd: string): number | null {
  const compactDate = dateYmd.replaceAll('-', '')
  const pattern = new RegExp(`^${compactDate}-(\\d{4,})$`)
  const match = traceNo.match(pattern)
  if (!match) return null
  const sequence = Number.parseInt(match[1], 10)
  return Number.isNaN(sequence) ? null : sequence
}

/**
 * 当日発行済みTraceNo一覧から最大通番を求める（該当なしは 0）。
 * buildSerialNumber と同様、文字列の辞書順比較では通番5桁以上を誤るため数値変換して比較する。
 */
export function getMaxTraceSequence(traceNos: string[], dateYmd: string): number {
  return traceNos.reduce((max, traceNo) => {
    const sequence = extractTraceSequence(traceNo, dateYmd)
    return sequence !== null && sequence > max ? sequence : max
  }, 0)
}

/** シリアル番号・有効期限・出荷先No・TraceNoからトレーサビリティQRペイロード文字列を組み立てる */
export function buildTraceQrPayload(
  serial: string,
  expiration: string,
  shipToNo: number,
  traceNo: string
): string {
  return `SERIAL:${serial},EXP:${expiration},ShipTo:${shipToNo},TraceNo:${traceNo}`
}
