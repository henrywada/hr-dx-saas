'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { toJSTDateString, toJSTISOString } from '@/lib/datetime'
import { sendExpirationAlertEmail } from '@/lib/mail'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getAlertDateRange } from './queries'
import {
  buildQrPayload,
  buildSerialNumber,
  buildTraceNo,
  buildTraceQrPayload,
  getMaxSerialSequence,
  getMaxTraceSequence,
} from './lib/qr-parser'
import {
  companyIdSchema,
  issueLabelsSchema,
  issueTraceLabelSchema,
  registerDeliverySchema,
  registerReceivingSchema,
  upsertCompanySchema,
  type DeliveryLogWithCompany,
  type IssueLabelsInput,
  type IssuedLabel,
  type IssueTraceLabelInput,
  type MyouProduct,
  type ProductTraceResult,
  type RegisterDeliveryInput,
  type RegisterReceivingInput,
  type TraceLabel,
} from './types'

async function getSupabase() {
  return await createClient()
}

/**
 * 特定の製品（シリアル番号）の流通履歴を取得する
 * ※ クライアントの検索フォームから呼び出すため Server Action として公開する
 */
export async function getProductTrace(serialNumber: string): Promise<ProductTraceResult | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const supabase = await getSupabase()

  // 1. 製品基本情報を取得（RLS に加えて明示的にテナントを絞る）
  const { data: product, error: productError } = await supabase
    .from('myou_products')
    .select('*')
    .eq('serial_number', serialNumber.trim())
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (productError || !product) {
    if (productError) console.error('Product not found:', serialNumber, productError)
    return null
  }

  // 2. 流通履歴（出荷ログ）を取得
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
    .eq('serial_number', serialNumber.trim())
    .eq('tenant_id', user.tenant_id)
    .order('delivery_date', { ascending: false })
    .order('registered_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching delivery logs:', logsError)
  }

  return {
    // 生成型の status は string のため、ドメイン型（union）へキャストする
    product: product as MyouProduct,
    history: (logs || []) as DeliveryLogWithCompany[],
  }
}

/**
 * 入荷登録（製造元 →（株）ミュー）を実行する
 * QRスキャンで読み取った製品を在庫（in_stock）として登録し、入荷日を記録する
 */
export async function registerReceiving(formData: RegisterReceivingInput) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = registerReceivingSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' }
  }
  const input = parsed.data

  const supabase = await getSupabase()

  // 既存レコードの状態を確認（出荷済みの再入荷は警告付きで受け付ける）
  const { data: existing } = await supabase
    .from('myou_products')
    .select('serial_number, status')
    .eq('serial_number', input.serial_number)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  const { error: productError } = await supabase.from('myou_products').upsert(
    {
      serial_number: input.serial_number,
      expiration_date: input.expiration_date,
      status: 'in_stock',
      received_at: toJSTDateString(),
      tenant_id: user.tenant_id,
    },
    { onConflict: 'tenant_id,serial_number' }
  )

  if (productError) {
    console.error('Error upserting product (receiving):', productError)
    return { success: false, error: '入荷情報の登録に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.MYOU.RECEIVING_SCAN)
  revalidatePath(APP_ROUTES.MYOU.INVENTORY)

  if (existing?.status === 'delivered') {
    return {
      success: true,
      warning: `${input.serial_number} は出荷済みでしたが、再入荷として在庫に戻しました。`,
    }
  }
  if (existing?.status === 'in_stock') {
    return {
      success: true,
      warning: `${input.serial_number} は既に入荷済みです（情報を更新しました）。`,
    }
  }
  return { success: true }
}

/**
 * 出荷登録（（株）ミュー → 施工会社）を実行する
 * 製品の状態更新と出荷履歴の挿入は RPC（myou_register_delivery）で
 * 単一トランザクションとして実行する（履歴だけ欠落する部分成功を防ぐ）
 */
export async function registerDelivery(formData: RegisterDeliveryInput) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = registerDeliverySchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' }
  }
  const input = parsed.data

  const supabase = await getSupabase()

  // 未入荷（在庫に無い）シリアルの出荷は運用初期を考慮して警告付きで受け付ける
  const { data: existing } = await supabase
    .from('myou_products')
    .select('serial_number, status')
    .eq('serial_number', input.serial_number)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  const { error } = await supabase.rpc('myou_register_delivery', {
    p_serial_number: input.serial_number,
    p_expiration_date: input.expiration_date,
    p_company_id: input.company_id,
    p_delivery_date: toJSTDateString(),
    p_delivered_by: user.name ?? null,
    p_last_delivery_at: toJSTISOString(),
    p_registered_at: toJSTISOString(),
  })

  if (error) {
    console.error('Error registering delivery:', error)
    return { success: false, error: '出荷登録に失敗しました。もう一度お試しください。' }
  }

  revalidatePath(APP_ROUTES.MYOU.DELIVERY_SCAN)
  revalidatePath(APP_ROUTES.MYOU.INVENTORY)

  if (!existing || existing.status === 'issued') {
    return {
      success: true,
      warning: `${input.serial_number} は入荷登録がありませんが、出荷として登録しました。`,
    }
  }
  return { success: true }
}

/**
 * QRラベルを発行する
 * シリアル番号（MS-YYYYMMDD-NNNN）をテナント内の当日通番で採番し、
 * status = 'issued' で myou_products に登録して QR ペイロードを返す
 */
export async function issueLabels(
  formData: IssueLabelsInput
): Promise<{ success: boolean; labels?: IssuedLabel[]; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = issueLabelsSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? '入力内容が不正です。' }
  }
  const input = parsed.data

  const supabase = await getSupabase()
  const todayYmd = toJSTDateString()

  // 当日発行分の最大通番を取得して続きから採番する
  // 文字列の辞書順ソートでは通番5桁（10000〜）を正しく比較できないため、
  // 当日分を全件取得して数値比較で最大値を求める（1日の発行量は少なく軽量）
  // ※ 同時実行時に採番が衝突する可能性はあるが、(tenant_id, serial_number) の
  //   主キー制約で重複登録は防がれる（低頻度運用のため許容し、失敗時は再実行を促す）
  const compactDate = todayYmd.replaceAll('-', '')
  const { data: issuedToday, error: latestError } = await supabase
    .from('myou_products')
    .select('serial_number')
    .eq('tenant_id', user.tenant_id)
    .like('serial_number', `MS-${compactDate}-%`)

  if (latestError) {
    console.error('Error fetching latest serial:', latestError)
    return { success: false, error: 'シリアル番号の採番に失敗しました。' }
  }

  const lastSequence = getMaxSerialSequence(
    (issuedToday ?? []).map(row => row.serial_number),
    todayYmd
  )

  const labels: IssuedLabel[] = Array.from({ length: input.quantity }, (_, index) => {
    const serial = buildSerialNumber(todayYmd, lastSequence + index + 1)
    return {
      serial_number: serial,
      expiration_date: input.expiration_date,
      qr_payload: buildQrPayload(serial, input.expiration_date),
    }
  })

  const { error: insertError } = await supabase.from('myou_products').insert(
    labels.map(label => ({
      serial_number: label.serial_number,
      expiration_date: label.expiration_date,
      status: 'issued',
      issued_at: toJSTISOString(),
      tenant_id: user.tenant_id,
    }))
  )

  if (insertError) {
    console.error('Error inserting issued labels:', insertError)
    return { success: false, error: 'ラベルの発行登録に失敗しました。もう一度お試しください。' }
  }

  revalidatePath(APP_ROUTES.MYOU.LABELS)
  return { success: true, labels }
}

/**
 * 施工会社に手動でアラートメールを送信し、ログを記録する
 */
export async function sendManualAlert(companyId: string) {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsedId = companyIdSchema.safeParse(companyId)
  if (!parsedId.success) {
    return { success: false, error: parsedId.error.issues[0]?.message ?? '会社IDが不正です' }
  }

  const supabase = await getSupabase()

  // 1. 対象の製品と会社情報を取得
  const { from, to } = getAlertDateRange()

  const { data: products, error: productError } = await supabase
    .from('myou_products')
    .select('serial_number, expiration_date')
    .eq('tenant_id', user.tenant_id)
    .eq('current_company_id', companyId)
    .eq('status', 'delivered')
    .gte('expiration_date', from)
    .lte('expiration_date', to)

  if (productError || !products || products.length === 0) {
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

  // 2. メール送信実行
  const mailResult = await sendExpirationAlertEmail(
    company.email_address,
    company.name,
    products.map((p: { serial_number: string; expiration_date: string }) => ({
      serial_number: p.serial_number,
      expiration_date: p.expiration_date,
    }))
  )

  // 3. ログの記録
  const { error: logError } = await supabase.from('myou_alert_logs').insert({
    company_id: companyId,
    target_serials: products.map((p: { serial_number: string }) => p.serial_number),
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
    // 23503 = 外部キー制約違反（製品の納入先・出荷履歴から参照されている）
    if (error.code === '23503') {
      return {
        success: false,
        error: 'この会社は製品の納入先または出荷履歴から参照されているため削除できません。',
      }
    }
    return { success: false, error: '施工会社の削除に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.MYOU.COMPANIES)
  revalidatePath(APP_ROUTES.MYOU.DELIVERY_SCAN)

  return { success: true }
}

/**
 * トレーサビリティQRラベルを発行する
 * 当日・テナント内の通番（TraceNo）を採番し、myou_trace_labels に記録してQRペイロードを返す
 */
export async function issueTraceLabel(
  formData: IssueTraceLabelInput
): Promise<{ success: boolean; label?: TraceLabel; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: '認証エラー' }

  const parsed = issueTraceLabelSchema.safeParse(formData)
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
    console.error('Error fetching company for trace label:', companyError)
    return { success: false, error: '出荷先（施工会社）が見つかりませんでした。' }
  }

  const todayYmd = toJSTDateString()
  const compactDate = todayYmd.replaceAll('-', '')

  // 当日発行分の最大通番を取得して続きから採番する
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

  const { error: insertError } = await supabase.from('myou_trace_labels').insert({
    tenant_id: user.tenant_id,
    company_id: input.company_id,
    serial_number: input.serial_number,
    expiration_date: input.expiration_date,
    trace_no: traceNo,
  })

  if (insertError) {
    console.error('Error inserting trace label:', insertError)
    return {
      success: false,
      error: 'トレーサビリティQRの発行に失敗しました。もう一度お試しください。',
    }
  }

  return {
    success: true,
    label: {
      trace_no: traceNo,
      company_no: company.company_no,
      qr_payload: buildTraceQrPayload(
        input.serial_number,
        input.expiration_date,
        company.company_no,
        traceNo
      ),
    },
  }
}
