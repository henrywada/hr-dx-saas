import { z } from 'zod'

/**
 * 製品ステータスのライフサイクル
 * issued（ラベル発行済） → in_stock（入荷済・在庫） → delivered（出荷済）
 */
export type MyouProductStatus = 'issued' | 'in_stock' | 'delivered'

/** ステータスの表示ラベル */
export const MYOU_STATUS_LABELS: Record<MyouProductStatus, string> = {
  issued: 'ラベル発行済',
  in_stock: '在庫（入荷済）',
  delivered: '出荷済',
}

/** 施工会社（画面表示用にマッピング済み） */
export interface MyouCompany {
  company_id: string
  company_name: string
  company_no: number
  email_address?: string
}

/** 製品レコード */
export interface MyouProduct {
  serial_number: string
  expiration_date: string | null
  status: MyouProductStatus
  last_delivery_at: string | null
  current_company_id: string | null
  received_at: string | null
  issued_at: string | null
  created_at: string
}

/** 在庫一覧の行 */
export interface InventoryItem {
  serial_number: string
  expiration_date: string | null
  received_at: string | null
  status: MyouProductStatus
}

/** 配送履歴（施工会社名JOIN済み） */
export interface DeliveryLogWithCompany {
  id: string
  serial_number: string
  company_id: string
  delivery_date: string
  delivered_by: string | null
  registered_at: string
  myou_companies: { name: string } | null
}

/** トレース照会の結果 */
export interface ProductTraceResult {
  product: MyouProduct
  history: DeliveryLogWithCompany[]
}

/** アラート送信ログの行 */
export interface AlertLogRow {
  id: string
  company_id: string
  sent_at: string
  target_serials: string[]
  status: string
  error_message: string | null
  myou_companies: { name: string } | null
}

/** 有効期限間近の製品（施工会社JOIN済み） */
export interface ExpiringProduct {
  serial_number: string
  expiration_date: string
  status: MyouProductStatus
  current_company_id: string | null
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

/** 入荷処理の入力（スキャン済みの場合は scanned_serial を指定し、その番号を起点に連番で数量分登録する） */
export const processReceivingSchema = z.object({
  scanned_serial: z.string().trim().optional(),
  expiration_date: dateStringSchema,
  quantity: z
    .number()
    .int()
    .min(1, '1以上を指定してください')
    .max(1000, '一度に登録できるのは1000件までです'),
})
export type ProcessReceivingInput = z.infer<typeof processReceivingSchema>

/** 出荷登録の入力 */
export const registerDeliverySchema = z.object({
  serial_number: z.string().trim().min(1, 'シリアル番号が読み取れませんでした'),
  expiration_date: dateStringSchema,
  company_id: z.string().uuid('出荷先（施工会社）を選択してください'),
})
export type RegisterDeliveryInput = z.infer<typeof registerDeliverySchema>

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

/** QRラベル発行の入力 */
export const issueLabelsSchema = z.object({
  expiration_date: dateStringSchema,
  quantity: z
    .number()
    .int()
    .min(1, '1枚以上を指定してください')
    .max(100, '一度に発行できるのは100枚までです'),
})
export type IssueLabelsInput = z.infer<typeof issueLabelsSchema>

/** 発行されたラベル1枚分の情報 */
export interface IssuedLabel {
  serial_number: string
  expiration_date: string
  qr_payload: string
}

/** トレーサビリティQR発行の入力 */
export const issueTraceLabelSchema = z.object({
  company_id: z.string().uuid('出荷先（施工会社）を選択してください'),
  serial_number: z.string().trim().min(1, 'シリアル番号を入力してください'),
  expiration_date: dateStringSchema,
})
export type IssueTraceLabelInput = z.infer<typeof issueTraceLabelSchema>

/** 発行されたトレーサビリティラベル1件分の情報 */
export interface TraceLabel {
  trace_no: string
  company_no: number
  serial_number: string
  expiration_date: string
  qr_payload: string
}
