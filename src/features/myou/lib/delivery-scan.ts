import { parseLotQrContent } from './qr-parser'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface PrepareDeliveryScanInput {
  decodedText: string
  selectedCompanyId: string
  quantity: number
  expirationDate: string
}

export type PrepareDeliveryScanResult =
  | { ok: true; lotNo: string }
  | { ok: false; error: string; lotNo: string }

/**
 * 出荷QRスキャン結果を検証する。
 * ロット番号は常に返し、未選択・未入力があっても「読んだのに無反応」にしない。
 */
export function prepareDeliveryScan(input: PrepareDeliveryScanInput): PrepareDeliveryScanResult {
  const { lotNo } = parseLotQrContent(input.decodedText)

  if (!input.selectedCompanyId) {
    return { ok: false, error: '先に出荷先（施工会社）を選択してください。', lotNo }
  }
  if (Number.isNaN(input.quantity) || input.quantity < 1) {
    return { ok: false, error: '受注数量を入力してください。', lotNo }
  }
  if (!DATE_PATTERN.test(input.expirationDate)) {
    return { ok: false, error: '有効期限を入力してください。', lotNo }
  }
  if (!lotNo) {
    return { ok: false, error: 'ロット番号が読み取れませんでした。', lotNo }
  }

  return { ok: true, lotNo }
}
