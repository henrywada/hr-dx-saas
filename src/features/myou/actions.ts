'use server'

import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { toJSTDateString } from '@/lib/datetime'
import { sendExpirationAlertEmail } from '@/lib/mail'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getAlertDateRange } from './queries'
import {
  buildLotNo,
  buildLotQrPayload,
  buildTraceNo,
  buildTraceQrPayload,
  getMaxLotSequence,
  getMaxTraceSequence,
} from './lib/qr-parser'
import {
  companyIdSchema,
  deliverFromLotSchema,
  receiveLotSchema,
  upsertCompanySchema,
  type DeliverFromLotInput,
  type DeliveryLogWithCompany,
  type LotTraceResult,
  type MyouLot,
  type ReceiveLotInput,
  type TraceLabel,
} from './types'

async function getSupabase() {
  return await createClient()
}

/**
 * ロット番号または TraceNo を起点に、ロットの現在状態と出荷履歴を取得する
 * ※ クライアントの検索フォームから呼び出すため Server Action として公開する
 */
export async function getLotTrace(identifier: string): Promise<LotTraceResult | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const supabase = await getSupabase()
  const trimmed = identifier.trim()

  // 1. まずロット番号として検索する
  const { data: lotByNo } = await supabase
    .from('myou_lots')
    .select('*')
    .eq('lot_no', trimmed)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  let lot = lotByNo as MyouLot | null

  // 2. 見つからなければ TraceNo として検索し、紐付くロットを取得する
  if (!lot) {
    const { data: traceLabel } = await supabase
      .from('myou_trace_labels')
      .select('lot_id')
      .eq('trace_no', trimmed)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle()

    if (traceLabel?.lot_id) {
      const { data: lotByTrace } = await supabase
        .from('myou_lots')
        .select('*')
        .eq('id', traceLabel.lot_id)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle()
      lot = (lotByTrace as MyouLot) ?? null
    }
  }

  if (!lot) return null

  // 3. 出荷履歴（このロットからの払い出し）を取得
  const { data: logs, error: logsError } = await supabase
    .from('myou_delivery_logs')
    .select(
      `
      *,
      myou_companies (
        name
      )
    `
    )
    .eq('lot_id', lot.id)
    .eq('tenant_id', user.tenant_id)
    .order('delivery_date', { ascending: false })
    .order('registered_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching delivery logs:', logsError)
  }

  return {
    lot,
    history: (logs || []) as DeliveryLogWithCompany[],
  }
}

/**
 * 入荷処理（製造元 →（株）ミュー）を実行する
 * スキャン済みロットがあればそのロットに数量を加算登録し、無ければ本日日付で
 * 新規ロット番号を採番して新規ロットとして在庫登録する
 */
export async function receiveLot(formData: ReceiveLotInput): Promise<{
  success: boolean
  error?: string
  warning?: string
  registered_lot_no?: string
}> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = receiveLotSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' }
  }
  const input = parsed.data

  const supabase = await getSupabase()
  const todayYmd = toJSTDateString()

  let lotNo: string

  if (input.scanned_lot_no) {
    lotNo = input.scanned_lot_no
  } else {
    // 未スキャン: 本日発行分の最大通番を取得して続きから採番する（新規ロットとして登録）
    const compactDate = todayYmd.replaceAll('-', '')
    const { data: issuedToday, error: fetchError } = await supabase
      .from('myou_lots')
      .select('lot_no')
      .eq('tenant_id', user.tenant_id)
      .like('lot_no', `LOT-${compactDate}-%`)

    if (fetchError) {
      console.error('Error fetching latest lot_no for receiving:', fetchError)
      return { success: false, error: 'ロット番号の採番に失敗しました。' }
    }

    const lastSequence = getMaxLotSequence(
      (issuedToday ?? []).map(row => row.lot_no),
      todayYmd
    )
    lotNo = buildLotNo(todayYmd, lastSequence + 1)
  }

  // ロットの検索・数量加算（または新規登録）は RPC 内で行ロック（FOR UPDATE）して
  // アトミックに実行する。同時実行時に数量加算が失われる（lost update）事故を防ぐため。
  const { data: result, error: rpcError } = await supabase
    .rpc('myou_receive_lot', {
      p_lot_no: lotNo,
      p_qr_payload: buildLotQrPayload(lotNo, '', input.expiration_date),
      p_expiration_date: input.expiration_date,
      p_quantity: input.quantity,
      p_received_at: todayYmd,
    })
    .single()

  if (rpcError || !result) {
    console.error('Error receiving lot:', rpcError)
    return { success: false, error: '入荷登録に失敗しました。もう一度お試しください。' }
  }

  revalidatePath(APP_ROUTES.MYOU.RECEIVING_SCAN)
  revalidatePath(APP_ROUTES.MYOU.INVENTORY)

  const typedResult = result as { is_new: boolean; previous_status: string | null }

  if (typedResult.previous_status === 'depleted') {
    return {
      success: true,
      registered_lot_no: lotNo,
      warning: `${lotNo} は出荷済み（残数0）でしたが、再入荷として在庫に戻しました。`,
    }
  }
  if (typedResult.previous_status === 'in_stock') {
    return {
      success: true,
      registered_lot_no: lotNo,
      warning: `${lotNo} は既に入荷済みです（数量を追加登録しました）。`,
    }
  }
  return { success: true, registered_lot_no: lotNo }
}

/**
 * 出荷登録（（株）ミュー → 施工会社、ロット引当）を実行する
 * ロット残数の減算・出荷履歴・トレーサビリティQR発行は RPC（myou_deliver_from_lot）で
 * 単一トランザクションとして実行する（在庫の過剰引当・履歴欠落を防ぐ）。
 * 残数不足の場合はロットをまたぐ自動引き当ては行わず、エラーを返して
 * 運用者に別ロットの再スキャンを促す。
 */
export async function deliverFromLot(formData: DeliverFromLotInput): Promise<{
  success: boolean
  error?: string
  label?: TraceLabel
}> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = deliverFromLotSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' }
  }
  const input = parsed.data

  const supabase = await getSupabase()

  // 出荷先がテナント内に存在するか検証しつつ company_no を取得する
  const { data: company, error: companyError } = await supabase
    .from('myou_companies')
    .select('company_no')
    .eq('id', input.company_id)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (companyError || !company) {
    console.error('Error fetching company for delivery:', companyError)
    return { success: false, error: '出荷先（施工会社）が見つかりませんでした。' }
  }

  const todayYmd = toJSTDateString()
  const compactDate = todayYmd.replaceAll('-', '')

  // 当日発行分の最大TraceNo通番を取得して続きから採番する
  // ※ 同時実行時に採番が衝突する可能性はあるが、低頻度運用のため許容し、失敗時は再実行を促す
  const { data: issuedToday, error: latestError } = await supabase
    .from('myou_trace_labels')
    .select('trace_no')
    .eq('tenant_id', user.tenant_id)
    .like('trace_no', `${compactDate}-%`)

  if (latestError) {
    console.error('Error fetching latest trace_no:', latestError)
    return { success: false, error: 'TraceNoの採番に失敗しました。' }
  }

  const lastSequence = getMaxTraceSequence(
    (issuedToday ?? []).map(row => row.trace_no),
    todayYmd
  )
  const traceNo = buildTraceNo(todayYmd, lastSequence + 1)
  // myou_trace_labels の行IDを事前採番し、QRペイロード（公開ページURL）の組み立てに使う
  const traceLabelId = randomUUID()

  const { data: result, error: rpcError } = await supabase
    .rpc('myou_deliver_from_lot', {
      p_lot_no: input.lot_no,
      p_company_id: input.company_id,
      p_quantity: input.quantity,
      p_delivered_by: user.name ?? null,
      p_delivery_date: todayYmd,
      p_trace_no: traceNo,
      p_customer_order_no: input.customer_order_no || null,
      p_trace_label_id: traceLabelId,
    })
    .single()

  if (rpcError || !result) {
    console.error('Error delivering from lot:', rpcError)
    const message = rpcError?.message ?? ''
    if (message.includes('見つかりません')) {
      return { success: false, error: `ロット ${input.lot_no} が見つかりませんでした。` }
    }
    if (message.includes('不足')) {
      return { success: false, error: `${message}。別のロットをスキャンしてください。` }
    }
    return { success: false, error: '出荷登録に失敗しました。もう一度お試しください。' }
  }

  revalidatePath(APP_ROUTES.MYOU.DELIVERY_SCAN)
  revalidatePath(APP_ROUTES.MYOU.INVENTORY)
  revalidatePath(APP_ROUTES.MYOU.DELIVERY_HISTORY)

  const typedResult = result as { expiration_date: string }

  // NEXT_PUBLIC_APP_URL が未設定の環境（Vercel の Preview/Production 等）でも
  // QRコードのURLがlocalhostにならないよう、VERCEL_URLからも本番URLを推定する
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  return {
    success: true,
    label: {
      trace_no: traceNo,
      lot_no: input.lot_no,
      company_no: company.company_no,
      quantity: input.quantity,
      expiration_date: typedResult.expiration_date,
      qr_payload: buildTraceQrPayload(baseUrl, traceLabelId, traceNo),
    },
  }
}

/**
 * 施工会社に手動でアラートメールを送信し、ログを記録する
 * 対象は「有効期限が30日以内のトレーサビリティQR発行分（＝客先出荷済みで期限間近のもの）」
 */
export async function sendManualAlert(companyId: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsedId = companyIdSchema.safeParse(companyId)
  if (!parsedId.success) {
    return { success: false, error: parsedId.error.issues[0]?.message ?? '会社IDが不正です' }
  }

  const supabase = await getSupabase()

  // 1. 対象のトレーサビリティQR発行分と会社情報を取得
  const { from, to } = getAlertDateRange()

  const { data: labels, error: labelsError } = await supabase
    .from('myou_trace_labels')
    .select(
      `
      trace_no,
      quantity,
      expiration_date,
      myou_lots (
        lot_no
      )
    `
    )
    .eq('tenant_id', user.tenant_id)
    .eq('company_id', companyId)
    .gte('expiration_date', from)
    .lte('expiration_date', to)

  if (labelsError || !labels || labels.length === 0) {
    return { success: false, error: '対象の期限間近製品が見つかりませんでした。' }
  }

  const { data: company, error: companyError } = await supabase
    .from('myou_companies')
    .select('name, email_address')
    .eq('id', companyId)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (companyError || !company || !company.email_address) {
    return { success: false, error: '送信先のメールアドレスが登録されていません。' }
  }

  const items = (
    labels as {
      trace_no: string
      quantity: number
      expiration_date: string
      myou_lots: { lot_no: string } | null
    }[]
  ).map(label => ({
    trace_no: label.trace_no,
    lot_no: label.myou_lots?.lot_no ?? '',
    quantity: label.quantity,
    expiration_date: label.expiration_date,
  }))

  // 2. メール送信実行
  const mailResult = await sendExpirationAlertEmail(company.email_address, company.name, items)

  // 3. ログの記録
  const { error: logError } = await supabase.from('myou_alert_logs').insert({
    company_id: companyId,
    target_trace_nos: items.map(item => item.trace_no),
    status: mailResult.success ? 'success' : 'error',
    error_message: mailResult.success ? null : mailResult.error,
  })

  if (logError) {
    console.error('Error logging alert:', logError)
  }

  revalidatePath(APP_ROUTES.MYOU.EXPIRATION_ALERTS)

  if (mailResult.success) {
    return { success: true }
  }
  return { success: false, error: mailResult.error }
}

/**
 * 施工会社の情報を登録・更新する (保守用)
 */
export async function upsertCompany(formData: {
  id?: string
  name: string
  email_address: string
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return {
      success: false,
      error: 'ユーザー情報を取得できませんでした。再ログインをお試しください。',
    }
  }

  const parsed = upsertCompanySchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' }
  }
  const input = parsed.data

  const supabase = await getSupabase()

  const companyData = {
    name: input.name,
    // 空文字は未登録として null で保存する
    email_address: input.email_address === '' ? null : input.email_address,
    tenant_id: user.tenant_id,
  }

  let result
  if (input.id) {
    // 更新
    result = await supabase
      .from('myou_companies')
      .update(companyData)
      .eq('id', input.id)
      .eq('tenant_id', user.tenant_id)
  } else {
    // 新規作成: テナント内の現在最大値+1を出荷先No（company_no）として採番する
    const { data: existingCompanies, error: fetchError } = await supabase
      .from('myou_companies')
      .select('company_no')
      .eq('tenant_id', user.tenant_id)

    if (fetchError) {
      console.error('Error fetching company_no for numbering:', fetchError)
      return { success: false, error: '出荷先Noの採番に失敗しました。' }
    }

    const maxCompanyNo = (existingCompanies ?? []).reduce(
      (max, row) => (row.company_no > max ? row.company_no : max),
      0
    )

    result = await supabase
      .from('myou_companies')
      .insert({ ...companyData, company_no: maxCompanyNo + 1 })
  }

  if (result.error) {
    console.error('Error upserting company:', {
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      code: result.error.code,
    })
    return { success: false, error: '施工会社の保存に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.MYOU.COMPANIES)
  revalidatePath(APP_ROUTES.MYOU.DELIVERY_SCAN)
  revalidatePath(APP_ROUTES.MYOU.EXPIRATION_ALERTS)

  return { success: true }
}

/**
 * 施工会社を削除する (保守用)
 */
export async function deleteCompany(id: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsedId = companyIdSchema.safeParse(id)
  if (!parsedId.success) {
    return { success: false, error: parsedId.error.issues[0]?.message ?? '会社IDが不正です' }
  }

  const supabase = await getSupabase()

  const { error } = await supabase
    .from('myou_companies')
    .delete()
    .eq('id', parsedId.data)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('Error deleting company:', error)
    // 23503 = 外部キー制約違反（出荷履歴・トレーサビリティQR発行履歴から参照されている）
    if (error.code === '23503') {
      return {
        success: false,
        error:
          'この会社は出荷履歴またはトレーサビリティQR発行履歴から参照されているため削除できません。',
      }
    }
    return { success: false, error: '施工会社の削除に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.MYOU.COMPANIES)
  revalidatePath(APP_ROUTES.MYOU.DELIVERY_SCAN)

  return { success: true }
}
