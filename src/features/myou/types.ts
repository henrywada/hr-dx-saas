import { z } from 'zod'

/**
 * 製造ロットのライフサイクル
 * issued（ロットQR発行済・数量未確定） → in_stock（入荷済・残数あり） → depleted（残数0）
 */
export type MyouLotStatus = 'issued' | 'in_stock' | 'depleted'

/** ステータスの表示ラベル */
export const MYOU_LOT_STATUS_LABELS: Record<MyouLotStatus, string> = {
  issued: 'ロットQR発行済み',
  in_stock: '在庫（入荷済み）',
  depleted: '出荷済み（残数0）',
}

/** 施工会社（画面表示用にマッピング済み） */
export interface MyouCompany {
  company_id: string
  company_name: string
  company_no: number
  email_address?: string
}

/** 製造ロットレコード */
export interface MyouLot {
  id: string
  lot_no: string
  qr_payload: string
  manufactured_date: string | null
  expiration_date: string
  quantity_total: number
  quantity_remaining: number
  status: MyouLotStatus
  received_at: string | null
  created_at: string
}

/** 在庫一覧の行 */
export interface LotInventoryItem {
  id: string
  lot_no: string
  expiration_date: string
  quantity_total: number
  quantity_remaining: number
  received_at: string | null
}

/** 出荷履歴（施工会社名JOIN済み） */
export interface DeliveryLogWithCompany {
  id: string
  lot_id: string
  quantity: number
  company_id: string
  delivery_date: string
  delivered_by: string | null
  registered_at: string
  customer_order_no: string | null
  trace_no: string | null
  myou_companies: { name: string } | null
}

/** 出荷リスト表の行（ロット番号・施工会社名を画面表示用にフラット化済み、出荷リスト画面の全件履歴表示用） */
export interface DeliveryHistoryRow {
  id: string
  lot_no: string
  company_id: string
  company_name: string
  company_no: number | null
  quantity: number
  delivery_date: string
  delivered_by: string | null
  registered_at: string
  customer_order_no: string | null
  trace_no: string | null
}

/** ロットトレース照会の結果 */
export interface LotTraceResult {
  lot: MyouLot
  history: DeliveryLogWithCompany[]
}

/** アラート送信ログの行 */
export interface AlertLogRow {
  id: string
  company_id: string
  sent_at: string
  target_trace_nos: string[]
  status: string
  error_message: string | null
  myou_companies: { name: string } | null
}

/** 有効期限間近のトレーサビリティQR発行分（客先出荷済み、施工会社JOIN済み） */
export interface ExpiringTraceLabel {
  trace_no: string
  lot_no: string
  quantity: number
  expiration_date: string
  company_id: string
  myou_companies: {
    id: string
    name: string
    email_address: string | null
  } | null
}

/** YYYY-MM-DD 形式の日付文字列 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD 形式で指定してください')
  .refine(value => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
    message: '存在しない日付です',
  })

/** 製造ロットQR発行の入力（数量はこの時点では未確定。入荷登録で確定する） */
export const issueLotsSchema = z.object({
  expiration_date: dateStringSchema,
  manufactured_date: dateStringSchema.optional(),
  count: z
    .number()
    .int()
    .min(1, '1件以上を指定してください')
    .max(100, '一度に発行できるのは100件までです'),
})
export type IssueLotsInput = z.infer<typeof issueLotsSchema>

/** 発行された製造ロットQR1件分の情報 */
export interface IssuedLot {
  lot_no: string
  expiration_date: string
  qr_payload: string
}

/** 入荷登録の入力（スキャン済みの場合は scanned_lot_no を指定する） */
export const receiveLotSchema = z.object({
  scanned_lot_no: z.string().trim().optional(),
  expiration_date: dateStringSchema,
  quantity: z
    .number()
    .int()
    .min(1, '1以上を指定してください')
    .max(100000, '一度に登録できるのは100000個までです'),
})
export type ReceiveLotInput = z.infer<typeof receiveLotSchema>

/** 出荷登録（ロット引当）の入力 */
export const deliverFromLotSchema = z.object({
  lot_no: z.string().trim().min(1, 'ロット番号が読み取れませんでした'),
  company_id: z.string().uuid('出荷先（施工会社）を選択してください'),
  quantity: z.number().int().min(1, '1以上を指定してください'),
  customer_order_no: z
    .string()
    .trim()
    .max(50, '客先注文番号は50文字以内で入力してください')
    .optional(),
})
export type DeliverFromLotInput = z.infer<typeof deliverFromLotSchema>

/** 会社ID（UUID）の検証 */
export const companyIdSchema = z.string().uuid('会社IDが不正です')

/** 施工会社の登録・更新入力 */
export const upsertCompanySchema = z.object({
  id: z.string().uuid('会社IDが不正です').optional(),
  name: z
    .string()
    .trim()
    .min(1, '会社名を入力してください')
    .max(100, '会社名は100文字以内で入力してください'),
  email_address: z
    .string()
    .trim()
    .max(255, 'メールアドレスが長すぎます')
    .refine(value => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: 'メールアドレスの形式が正しくありません',
    })
    .optional()
    .default(''),
})
export type UpsertCompanyInput = z.infer<typeof upsertCompanySchema>

/** 発行されたトレーサビリティQR1件分の情報 */
export interface TraceLabel {
  trace_no: string
  lot_no: string
  company_no: number
  quantity: number
  expiration_date: string
  qr_payload: string
}

/** トレーサビリティQR公開ページ（/p/myou/trace/[id]）に表示する情報 */
export interface PublicTraceInfo {
  lot_no: string
  trace_no: string
  company_no: number | null
  expiration_date: string
}
