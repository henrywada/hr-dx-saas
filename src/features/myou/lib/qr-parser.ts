/**
 * mYou 製造ロットQR／トレーサビリティQRコードのペイロード処理
 *
 * 製造ロットQR: 「LOT:<ロット番号>,MFG:<製造日 YYYY-MM-DD>,EXP:<有効期限 YYYY-MM-DD>」
 * 例: LOT:LOT-20260707-0001,MFG:2026-07-01,EXP:2026-12-31
 *
 * トレーサビリティQR（客先出荷単位）:
 *   「LOT:<ロット番号>,ShipTo:<出荷先No>,TraceNo:<YYYYMMDD-NNNN>,QTY:<数量>,EXP:<有効期限>」
 * 例: LOT:LOT-20260707-0001,ShipTo:3,TraceNo:20260718-0001,QTY:12,EXP:2026-12-31
 */

export interface ParsedLotQrContent {
  lotNo: string
  manufacturedDate: string
  expiration: string
}

export interface ParsedTraceQrContent {
  lotNo: string
  shipToNo: number | null
  traceNo: string
  quantity: number | null
  expiration: string
}

/** 「KEY:VALUE」形式のカンマ区切りテキストをキー（大文字化）→値のMapに変換する */
function parseKeyValuePairs(text: string): Map<string, string> {
  const pairs = new Map<string, string>()
  text.split(',').forEach(part => {
    const separatorIndex = part.indexOf(':')
    if (separatorIndex === -1) return
    const key = part.slice(0, separatorIndex).trim().toUpperCase()
    const value = part.slice(separatorIndex + 1).trim()
    pairs.set(key, value)
  })
  return pairs
}

/**
 * QRコードの読み取りテキストを解析して製造ロット番号・製造日・有効期限を取り出す。
 * 形式が合わない場合は全文をロット番号として扱う（手入力・旧ラベル互換）。
 */
export function parseLotQrContent(text: string): ParsedLotQrContent {
  const pairs = parseKeyValuePairs(text)
  const lotNo = pairs.get('LOT') ?? ''

  if (!lotNo) {
    return { lotNo: text.trim(), manufacturedDate: '', expiration: '' }
  }
  return {
    lotNo,
    manufacturedDate: pairs.get('MFG') ?? '',
    expiration: pairs.get('EXP') ?? '',
  }
}

/** トレーサビリティQRの読み取りテキストを解析して各項目を取り出す（欠落フィールドは null/空文字） */
export function parseTraceQrContent(text: string): ParsedTraceQrContent {
  const pairs = parseKeyValuePairs(text)
  const shipToRaw = pairs.get('SHIPTO')
  const quantityRaw = pairs.get('QTY')

  return {
    lotNo: pairs.get('LOT') ?? '',
    shipToNo: shipToRaw ? Number.parseInt(shipToRaw, 10) : null,
    traceNo: pairs.get('TRACENO') ?? '',
    quantity: quantityRaw ? Number.parseInt(quantityRaw, 10) : null,
    expiration: pairs.get('EXP') ?? '',
  }
}

/**
 * スキャンテキストからトレーサビリティ照会用の検索識別子を取り出す。
 * TraceNo を優先し、無ければロット番号、それも無ければ全文をそのまま返す。
 */
export function extractSearchIdentifier(text: string): string {
  const trace = parseTraceQrContent(text)
  if (trace.traceNo) return trace.traceNo
  const lot = parseLotQrContent(text)
  return lot.lotNo
}

/** ロット番号・製造日・有効期限から製造ロットQRペイロード文字列を組み立てる */
export function buildLotQrPayload(
  lotNo: string,
  manufacturedDate: string,
  expiration: string
): string {
  return `LOT:${lotNo},MFG:${manufacturedDate},EXP:${expiration}`
}

/** ロット番号の接頭辞 */
export const LOT_PREFIX = 'LOT'

/**
 * 発行日とテナント内の当日通番からロット番号を組み立てる。
 * 形式: LOT-YYYYMMDD-NNNN（例: LOT-20260707-0001）
 */
export function buildLotNo(dateYmd: string, sequence: number): string {
  const compactDate = dateYmd.replaceAll('-', '')
  return `${LOT_PREFIX}-${compactDate}-${String(sequence).padStart(4, '0')}`
}

/**
 * 当日発行済みロット番号の一覧から最大通番を求める（該当なしは 0）。
 * 文字列の辞書順では通番が5桁（10000〜）になった時点で大小を誤るため、
 * 必ず数値に変換してから比較する。
 */
export function getMaxLotSequence(lotNos: string[], dateYmd: string): number {
  return lotNos.reduce((max, lotNo) => {
    const sequence = extractLotSequence(lotNo, dateYmd)
    return sequence !== null && sequence > max ? sequence : max
  }, 0)
}

/**
 * 既存ロット番号から当日通番を取り出す。
 * 形式に合わない場合は null を返す。
 */
export function extractLotSequence(lotNo: string, dateYmd: string): number | null {
  const compactDate = dateYmd.replaceAll('-', '')
  const pattern = new RegExp(`^${LOT_PREFIX}-${compactDate}-(\\d{4,})$`)
  const match = lotNo.match(pattern)
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
 * buildLotNo と同様、文字列の辞書順比較では通番5桁以上を誤るため数値変換して比較する。
 */
export function getMaxTraceSequence(traceNos: string[], dateYmd: string): number {
  return traceNos.reduce((max, traceNo) => {
    const sequence = extractTraceSequence(traceNo, dateYmd)
    return sequence !== null && sequence > max ? sequence : max
  }, 0)
}

/** ロット番号・有効期限・出荷先No・TraceNo・数量からトレーサビリティQRペイロード文字列を組み立てる */
export function buildTraceQrPayload(
  lotNo: string,
  expiration: string,
  shipToNo: number,
  traceNo: string,
  quantity: number
): string {
  return `LOT:${lotNo},ShipTo:${shipToNo},TraceNo:${traceNo},QTY:${quantity},EXP:${expiration}`
}
