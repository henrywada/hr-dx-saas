/**
 * mYou 製造ロットQR／トレーサビリティQRコードのペイロード処理
 *
 * 製造ロットQR: 「LOT:<ロット番号>,MFG:<製造日 YYYY-MM-DD>,EXP:<有効期限 YYYY-MM-DD>」
 * 例: LOT:LOT-20260707-0001,MFG:2026-07-01,EXP:2026-12-31
 *
 * トレーサビリティQR（客先出荷単位）: 一般客がスマホでスキャンした際に案内ページが
 * 開くよう、公開ページ（/p/myou/trace/[id]）へのURLを埋め込む。
 * 例: https://app.hr-dx.jp/p/myou/trace/3f6b1c2e-...?traceNo=20260718-0001
 * ※ 旧形式「LOT:...,ShipTo:...,TraceNo:...,QTY:...,EXP:...」で既に発行済みの
 *   物理ラベルも、社内のトレーサビリティ検索で引き続きスキャンできるよう
 *   parseTraceQrContent は両形式を解釈できるようにしている。
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

/**
 * トレーサビリティQRの読み取りテキストを解析して各項目を取り出す（欠落フィールドは null/空文字）。
 * 新形式（公開ページURL、?traceNo=... クエリ付き）・旧形式（KEY:VALUE 形式）の両方に対応する。
 */
export function parseTraceQrContent(text: string): ParsedTraceQrContent {
  const trimmed = text.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      return {
        lotNo: '',
        shipToNo: null,
        traceNo: url.searchParams.get('traceNo') ?? '',
        quantity: null,
        expiration: '',
      }
    } catch {
      // URLとして解釈できない場合は下の旧形式パースにフォールバックする
    }
  }

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

/**
 * トレーサビリティQRペイロード（公開ページURL）を組み立てる。
 * スマホの標準カメラでスキャンした一般客が案内ページを開けるよう、
 * 表示に必要な項目（LOT／ShipTo／TraceNo／EXP等）はURLに埋め込まず、
 * 公開ページ側（/p/myou/trace/[id]）でDBから都度取得して表示する
 * （URL改ざんによる表示内容の偽装を防ぐため）。
 * traceNo のみ、社内のトレーサビリティ検索でのQR再スキャン対応のためクエリに含める。
 */
export function buildTraceQrPayload(
  baseUrl: string,
  traceLabelId: string,
  traceNo: string
): string {
  return `${baseUrl}/p/myou/trace/${traceLabelId}?traceNo=${encodeURIComponent(traceNo)}`
}
