import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { toJSTDateString } from '@/lib/datetime'
import type { AlertLogRow, ExpiringProduct, InventoryItem, MyouCompany } from './types'

/** アラート対象となる有効期限までの残日数 */
export const EXPIRATION_ALERT_DAYS = 30

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
    .select('id, name, email_address, created_at, tenant_id')
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
  return (data || []).map((row: { id: string; name: string; email_address: string | null }) => ({
    company_id: row.id,
    company_name: row.name,
    email_address: row.email_address ?? undefined,
  }))
}

/**
 * 有効期限が近い出荷済み製品（30日以内）の一覧を取得する
 * 施工会社情報もJOINする
 */
export async function getExpiringProducts(): Promise<ExpiringProduct[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await getSupabase()
  const { from, to } = getAlertDateRange()

  const { data, error } = await supabase
    .from('myou_products')
    .select(
      `
      serial_number,
      expiration_date,
      status,
      current_company_id,
      myou_companies (
        id,
        name,
        email_address
      )
    `
    )
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'delivered')
    .gte('expiration_date', from)
    .lte('expiration_date', to)
    .order('expiration_date', { ascending: true })

  if (error) {
    console.error('Error fetching expiring products:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }

  return (data || []) as ExpiringProduct[]
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
 * 在庫（入荷済み・未出荷）製品の一覧を取得する
 * 有効期限が近い順に並べる
 */
export async function getInventory(): Promise<InventoryItem[]> {
  const user = await getServerUser()
  if (!user?.tenant_id) return []

  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('myou_products')
    .select('serial_number, expiration_date, received_at, status')
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'in_stock')
    .order('expiration_date', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('Error fetching inventory:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return []
  }
  return (data || []) as InventoryItem[]
}
