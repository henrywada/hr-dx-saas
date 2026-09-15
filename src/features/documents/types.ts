import { z } from 'zod'

/** 文書種別（4値） */
export const DOCUMENT_TYPES = [
  'business_card',
  'invoice',
  'purchase_order',
  'receipt',
] as const

export type DocumentTypeValue = (typeof DOCUMENT_TYPES)[number]

export const documentTypeSchema = z.enum(DOCUMENT_TYPES)

/** 一覧スコープ */
export type DocumentListScope = 'own' | 'team' | 'company'

export const documentListScopeSchema = z.enum(['own', 'team', 'company'])

/** CSV エクスポート対象（第1波は請求書・発注書のみ） */
export const EXPORTABLE_DOCUMENT_TYPES = ['invoice', 'purchase_order'] as const

export type ExportableDocumentType = (typeof EXPORTABLE_DOCUMENT_TYPES)[number]

export const exportDocumentTypeSchema = z.enum(EXPORTABLE_DOCUMENT_TYPES)

export const invoiceCsvExportModeSchema = z.enum(['summary', 'with_line_items'])

/** Server Action 共通戻り値 */
export type DocumentActionResult =
  | { success: true; id: string; updated?: boolean }
  | { success: false; error: string }

/** OCR 解析結果 */
export type AnalyzeDuplicatePayload = {
  id: string
  canMutate: boolean
  extracted: Record<string, string>
  notes: string
  tags: string[]
  contextDate: string | null
  companyVisible: boolean
  images: Array<{ role: string; url: string | null }>
}

export type AnalyzeResult =
  | {
      success: true
      extracted: Record<string, string>
      lineItems?: import('@/lib/documents/pluginTypes').LineItemDraft[]
      rawOcr: string
      warning?: 'ocr_failed'
      duplicate: AnalyzeDuplicatePayload | null
    }
  | { success: false; error: string }

/** 一覧1件 */
export type DocumentListItem = {
  id: string
  documentType: string
  documentMode: string | null
  ownerUserId: string
  companyVisible: boolean
  title: string
  counterparty: string
  contextDate: string | null
  amountYen: number | null
  notes: string
  tags: string[]
  extracted: Record<string, string>
  createdAt: string
  updatedAt: string
  frontImageUrl: string | null
}

export type ListDocumentsResult = {
  documents: DocumentListItem[]
  hasMore: boolean
  nextOffset: number | null
}

/** 詳細 */
export type DocumentImageDetail = {
  id: string
  role: string
  sortOrder: number
  storagePath: string
  url: string | null
}

export type DocumentLineItemDetail = {
  id: string
  lineNo: number
  transactionDate: string | null
  description: string
  quantity: string
  unit: string
  unitPrice: number | null
  amount: number | null
  taxRate: string
}

export type DocumentDetail = DocumentListItem & {
  rawOcr: string
  canMutate: boolean
  images: DocumentImageDetail[]
  lineItems: DocumentLineItemDetail[]
}

/** 文書削除 */
export const deleteDocumentSchema = z.object({
  id: z.string().uuid(),
})

/** 文書更新（PATCH 相当） */
export const updateDocumentSchema = z.object({
  id: z.string().uuid(),
  companyVisible: z.boolean().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  contextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  extracted: z.record(z.string(), z.string()).optional(),
  lineItems: z.array(z.unknown()).optional(),
})

/** CSV エクスポート */
export const exportDocumentsSchema = z.object({
  documentType: exportDocumentTypeSchema,
  documentIds: z.array(z.string().uuid()).min(1).max(100),
  exportMode: invoiceCsvExportModeSchema.optional(),
})

/**
 * 名刺以外は company_visible を常に false に強制する。
 * create / update の Action 内で必ず通す。
 */
export function applyCompanyVisiblePolicy(
  documentType: string,
  companyVisible: boolean | undefined
): boolean {
  if (documentType !== 'business_card') {
    return false
  }
  return companyVisible === true
}

/** amount_yen の DB 値を number | null に正規化 */
export function parseAmountYen(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const EXPORT_INACCESSIBLE_IDS_MESSAGE = 'エクスポートできない文書が含まれています'

/** CSV エクスポート: 要求 ID 数と RLS で読めた件数を照合 */
export function findExportAccessError(
  requestedIds: readonly string[],
  readableCount: number
): string | null {
  if (readableCount === 0) return '文書が見つかりません'
  if (readableCount !== requestedIds.length) return EXPORT_INACCESSIBLE_IDS_MESSAGE
  return null
}

/** extracted jsonb を Record<string, string> に正規化 */
export function asExtracted(value: unknown): Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, string>)
    : {}
}
