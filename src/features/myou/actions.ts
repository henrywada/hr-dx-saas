'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { toJSTDateString, toJSTISOString } from '@/lib/datetime'
import { sendExpirationAlertEmail } from '@/lib/mail'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getAlertDateRange } from './queries'
import { buildQrPayload, buildSerialNumber, extractSerialSequence } from './lib/qr-parser'
import {
  issueLabelsSchema,
  registerDeliverySchema,
  registerReceivingSchema,
  type DeliveryLogWithCompany,
  type IssueLabelsInput,
  type IssuedLabel,
  type MyouProduct,
  type ProductTraceResult,
  type RegisterDeliveryInput,
  type RegisterReceivingInput,
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
    { onConflict: 'serial_number' }
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
 * 1. myou_products の状態を delivered に更新（upsert）
 * 2. myou_delivery_logs に出荷履歴を挿入
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
    .select('serial_number, status, received_at')
    .eq('serial_number', input.serial_number)
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  // 1. 製品情報の登録・更新
  const { error: productError } = await supabase.from('myou_products').upsert(
    {
      serial_number: input.serial_number,
      expiration_date: input.expiration_date,
      status: 'delivered',
      last_delivery_at: toJSTISOString(),
      current_company_id: input.company_id,
      received_at: existing?.received_at ?? null,
      tenant_id: user.tenant_id,
    },
    { onConflict: 'serial_number' }
  )

  if (productError) {
    console.error('Error upserting product (delivery):', productError)
    return { success: false, error: '製品情報の登録に失敗しました。' }
  }

  // 2. 出荷ログの記録（担当者名も残す）
  const { error: logError } = await supabase.from('myou_delivery_logs').insert({
    serial_number: input.serial_number,
    company_id: input.company_id,
    delivery_date: toJSTDateString(),
    delivered_by: user.name ?? null,
    registered_at: toJSTISOString(),
    tenant_id: user.tenant_id,
  })

  if (logError) {
    console.error('Error inserting delivery log:', logError)
    // 製品登録は成功しているがログに失敗したケース
    return { success: true, warning: '製品は登録されましたが、履歴の記録に失敗しました。' }
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
  // ※ 同時実行時に採番が衝突する可能性はあるが、serial_number の主キー制約で
  //   重複登録は防がれる（低頻度運用のため許容し、失敗時は再実行を促す）
  const compactDate = todayYmd.replaceAll('-', '')
  const { data: latest, error: latestError } = await supabase
    .from('myou_products')
    .select('serial_number')
    .eq('tenant_id', user.tenant_id)
    .like('serial_number', `MS-${compactDate}-%`)
    .order('serial_number', { ascending: false })
    .limit(1)

  if (latestError) {
    console.error('Error fetching latest serial:', latestError)
    return { success: false, error: 'シリアル番号の採番に失敗しました。' }
  }

  const lastSequence = latest?.[0]
    ? (extractSerialSequence(latest[0].serial_number, todayYmd) ?? 0)
    : 0

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

  const supabase = await getSupabase()

  const companyData = {
    name: formData.name,
    email_address: formData.email_address,
    tenant_id: user.tenant_id,
  }

  let result
  if (formData.id) {
    // 更新
    result = await supabase
      .from('myou_companies')
      .update(companyData)
      .eq('id', formData.id)
      .eq('tenant_id', user.tenant_id)
  } else {
    // 新規作成
    result = await supabase.from('myou_companies').insert(companyData)
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

  const supabase = await getSupabase()

  const { error } = await supabase
    .from('myou_companies')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    console.error('Error deleting company:', error)
    return { success: false, error: '施工会社の削除に失敗しました。' }
  }

  revalidatePath(APP_ROUTES.MYOU.COMPANIES)
  revalidatePath(APP_ROUTES.MYOU.DELIVERY_SCAN)

  return { success: true }
}
