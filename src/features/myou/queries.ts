import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { toJSTDateString } from '@/lib/datetime'
import type { AlertLogRow, ExpiringTraceLabel, LotInventoryItem, MyouCompany } from './types'

/** アラート対象となる有効期限までの残日数 */
export const EXPIRATION_ALERT_DAYS = 30

/** 在庫一覧の一度に取得する最大件数（無制限取得によるメモリ・転送量の膨張を防ぐ） */
export const LOTS_FETCH_LIMIT = 1000

async function getSupabase() {
  return await createClient()
}

/** アラート対象期間（今日〜30日後）を JST 基準で返す */
export function getAlertDateRange(): { from: string; to: string } {
  const from = toJSTDateString()
  const toDate = new Date()
  toDate.setDate(toDate.getDate() + EXPIRATION_ALERT_DAYS)
  return { from, to: toJSTDateString(toDate) }
}

/**
 * 施工会社（myou_companies）の一覧を取得する
 */
export async function getCompanies(): Promise<MyouCompany[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    console.warn('getCompanies: No tenant_id found for current user')
    return []
  }

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('myou_companies')
    .select('id, name, email_address, company_no, created_at, tenant_id')
    .eq('tenant_id', user.tenant_id)
    .order('name')

  if (error) {
    console.error('Error fetching companies:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }
  // スキーマは id/name、コンポーネントは company_id/company_name を期待するためマッピング
  return (data || []).map(
    (row: { id: string; name: string; email_address: string | null; company_no: number }) => ({
      company_id: row.id,
      company_name: row.name,
      company_no: row.company_no,
      email_address: row.email_address ?? undefined,
    })
  )
}

/**
 * 有効期限が近いトレーサビリティQR発行分（30日以内、＝客先出荷済みで有効期限間近のもの）の
 * 一覧を取得する。施工会社情報もJOINする
 */
export async function getExpiringTraceLabels(): Promise<ExpiringTraceLabel[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await getSupabase()
  const { from, to } = getAlertDateRange()

  const { data: labels, error } = await supabase
    .from('myou_trace_labels')
    .select(
      `
      trace_no,
      quantity,
      expiration_date,
      company_id,
      lot_id,
      myou_companies (
        id,
        name,
        email_address
      ),
      myou_lots (
        lot_no
      )
    `
    )
    .eq('tenant_id', user.tenant_id)
    .gte('expiration_date', from)
    .lte('expiration_date', to)
    .order('expiration_date', { ascending: true })

  if (error) {
    console.error('Error fetching expiring trace labels:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }

  return (labels || []).map(
    (row: {
      trace_no: string
      quantity: number
      expiration_date: string
      company_id: string
      myou_companies: { id: string; name: string; email_address: string | null } | null
      myou_lots: { lot_no: string } | null
    }) => ({
      trace_no: row.trace_no,
      lot_no: row.myou_lots?.lot_no ?? '',
      quantity: row.quantity,
      expiration_date: row.expiration_date,
      company_id: row.company_id,
      myou_companies: row.myou_companies,
    })
  )
}

/**
 * アラート送信履歴（直近50件）を取得する
 */
export async function getAlertLogs(): Promise<AlertLogRow[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('myou_alert_logs')
    .select(
      `
      *,
      myou_companies (
        name
      )
    `
    )
    .eq('tenant_id', user.tenant_id)
    .order('sent_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching alert logs:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }
  return (data || []) as AlertLogRow[]
}

/**
 * 在庫（残数がある）ロットの一覧を取得する
 * 有効期限が近い順に並べる
 */
export async function getLots(): Promise<LotInventoryItem[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('myou_lots')
    .select('id, lot_no, expiration_date, quantity_total, quantity_remaining, received_at')
    .eq('tenant_id', user.tenant_id)
    .gt('quantity_remaining', 0)
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .limit(LOTS_FETCH_LIMIT)

  if (error) {
    console.error('Error fetching lots:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }
  return (data || []) as LotInventoryItem[]
}
