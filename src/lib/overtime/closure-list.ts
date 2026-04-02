import type { SupabaseClient } from '@supabase/supabase-js'
import { lastDayOfMonthYmd } from '@/lib/datetime'
import type { Database, Tables } from '@/lib/supabase/types'

export type MonthlyClosureListRow = Tables<'monthly_overtime_closures'> & {
  /** 当該月の work_time_records 件数 */
  data_count: number
  /** overtime_applications で status=申請中 の件数（一覧列「申請中」） */
  application_count: number
  approved_count: number
  /** 当該月の overtime_applications で status=却下 の件数 */
  rejected_count: number
  /** monthly_overtime_closures に行がまだ無い月（勤怠・申請のみで検出） */
  isPendingMonth?: boolean
}

/** YYYY-MM-DD 文字列の論理最小・最大 */
function minYmd(...vals: (string | null | undefined)[]): string | null {
  const xs = vals.filter((v): v is string => Boolean(v)).map((v) => v.slice(0, 10))
  if (xs.length === 0) return null
  return xs.reduce((a, b) => (a < b ? a : b))
}

function maxYmd(...vals: (string | null | undefined)[]): string | null {
  const xs = vals.filter((v): v is string => Boolean(v)).map((v) => v.slice(0, 10))
  if (xs.length === 0) return null
  return xs.reduce((a, b) => (a > b ? a : b))
}

/**
 * 一覧に載る「締め処理未完了」（locked 以外）のうち、対象月が最も古い YYYY-MM。該当なしは null。
 */
export function suggestedOldestOpenYearMonth(items: MonthlyClosureListRow[]): string | null {
  const openRows = items.filter((r) => r.status !== 'locked')
  if (openRows.length === 0) return null
  const sorted = [...openRows].sort((a, b) =>
    String(a.year_month).localeCompare(String(b.year_month)),
  )
  const first = sorted[0]?.year_month
  if (first == null) return null
  const s = String(first).trim()
  return s.length >= 7 ? s.slice(0, 7) : null
}

/** 対象月キー YYYY-MM（year_month 先頭7文字と一致） */
function monthKeyFromYearMonthField(ym: string | null | undefined): string | null {
  if (!ym) return null
  const s = String(ym).trim()
  return s.length >= 7 ? s.slice(0, 7) : null
}

function buildPendingClosureRow(
  tenantId: string,
  monthKey: string,
  dataCount: number,
  applicationCount: number,
  approvedCount: number,
  rejectedCount: number,
): MonthlyClosureListRow {
  return {
    id: `pending:${monthKey}`,
    tenant_id: tenantId,
    year_month: `${monthKey}-01`,
    status: null,
    aggregate_version: null,
    aggregated_at: null,
    approved_by: null,
    closed_at: null,
    closed_by: null,
    created_at: null,
    updated_at: null,
    lock_reason: null,
    locked_by: null,
    data_count: dataCount,
    application_count: applicationCount,
    approved_count: approvedCount,
    rejected_count: rejectedCount,
    isPendingMonth: true,
  }
}

/**
 * 月次締め一覧 + 当月の打刻件数・申請中件数・承認済件数（サーバー・API 共用）
 * 締めマスタが無い月も、勤怠・申請がある月は行として表示する。
 */
export async function fetchMonthlyClosureListWithCounts(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<
  { ok: true; items: MonthlyClosureListRow[] } | { ok: false; error: string }
> {
  const [closureResult, wtrMinResult, wtrMaxResult, oaMinResult, oaMaxResult] = await Promise.all([
    supabase
      .from('monthly_overtime_closures')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('year_month', { ascending: false }),
    supabase
      .from('work_time_records')
      .select('record_date')
      .eq('tenant_id', tenantId)
      .order('record_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('work_time_records')
      .select('record_date')
      .eq('tenant_id', tenantId)
      .order('record_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('overtime_applications')
      .select('work_date')
      .eq('tenant_id', tenantId)
      .order('work_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('overtime_applications')
      .select('work_date')
      .eq('tenant_id', tenantId)
      .order('work_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (closureResult.error) {
    console.error('monthly_overtime_closures list', closureResult.error)
    return { ok: false, error: '一覧の取得に失敗しました' }
  }

  const rows = closureResult.data ?? []

  const wtrMin = wtrMinResult.data?.record_date
    ? String(wtrMinResult.data.record_date).slice(0, 10)
    : null
  const wtrMax = wtrMaxResult.data?.record_date
    ? String(wtrMaxResult.data.record_date).slice(0, 10)
    : null
  const oaMin = oaMinResult.data?.work_date
    ? String(oaMinResult.data.work_date).slice(0, 10)
    : null
  const oaMax = oaMaxResult.data?.work_date
    ? String(oaMaxResult.data.work_date).slice(0, 10)
    : null

  const closureFirstDays = rows.map((r) => String(r.year_month).slice(0, 10))
  const closureMin = closureFirstDays.length
    ? closureFirstDays.reduce((a, b) => (a < b ? a : b))
    : null
  const closureMax = closureFirstDays.length
    ? closureFirstDays.reduce((a, b) => (a > b ? a : b))
    : null

  let rangeMin = minYmd(closureMin, wtrMin, oaMin)
  let rangeMax = maxYmd(closureMax, wtrMax, oaMax)

  if (!rangeMin || !rangeMax) {
    if (rows.length === 0) {
      return { ok: true, items: [] }
    }
    rangeMin = closureMin!
    rangeMax = closureMax!
  }

  const minYmdStr = rangeMin
  const maxYmKey = monthKeyFromYearMonthField(rangeMax) ?? rangeMax.slice(0, 7)
  const rangeEnd = maxYmKey ? lastDayOfMonthYmd(maxYmKey) : rangeMax

  const [appResult, wtrResult] = await Promise.all([
    supabase
      .from('overtime_applications')
      .select('work_date, status')
      .eq('tenant_id', tenantId)
      .gte('work_date', minYmdStr)
      .lte('work_date', rangeEnd),
    supabase
      .from('work_time_records')
      .select('record_date')
      .eq('tenant_id', tenantId)
      .gte('record_date', minYmdStr)
      .lte('record_date', rangeEnd),
  ])

  if (appResult.error) {
    console.error('overtime_applications closure list aggregate', appResult.error)
    return { ok: false, error: '残業申請の集計に失敗しました' }
  }
  if (wtrResult.error) {
    console.error('work_time_records closure list count', wtrResult.error)
    return { ok: false, error: 'データ件数の集計に失敗しました' }
  }

  const pendingByMonth = new Map<string, number>()
  const monthsWithAnyOa = new Set<string>()
  const approvedByMonth = new Map<string, number>()
  const rejectedByMonth = new Map<string, number>()
  for (const ar of appResult.data ?? []) {
    const wd = ar.work_date
    const wdStr = typeof wd === 'string' ? wd : wd != null ? String(wd) : ''
    if (wdStr.length < 7) continue
    const mk = wdStr.slice(0, 7)
    monthsWithAnyOa.add(mk)
    if (ar.status === '申請中') {
      pendingByMonth.set(mk, (pendingByMonth.get(mk) ?? 0) + 1)
    }
    if (ar.status === '承認済') {
      approvedByMonth.set(mk, (approvedByMonth.get(mk) ?? 0) + 1)
    }
    if (ar.status === '却下') {
      rejectedByMonth.set(mk, (rejectedByMonth.get(mk) ?? 0) + 1)
    }
  }

  const dataCountByMonth = new Map<string, number>()
  for (const wr of wtrResult.data ?? []) {
    const rd = wr.record_date
    const rdStr = typeof rd === 'string' ? rd : rd != null ? String(rd) : ''
    if (rdStr.length < 7) continue
    const mk = rdStr.slice(0, 7)
    dataCountByMonth.set(mk, (dataCountByMonth.get(mk) ?? 0) + 1)
  }

  const activityMonthKeys = new Set<string>()
  for (const mk of monthsWithAnyOa) activityMonthKeys.add(mk)
  for (const mk of dataCountByMonth.keys()) activityMonthKeys.add(mk)

  const closureByMonth = new Map<string, Tables<'monthly_overtime_closures'>>()
  for (const row of rows) {
    const mk = monthKeyFromYearMonthField(row.year_month)
    if (mk) closureByMonth.set(mk, row)
  }

  const allMonthKeys = new Set<string>([...closureByMonth.keys(), ...activityMonthKeys])
  const sortedDescending = Array.from(allMonthKeys).sort((a, b) => b.localeCompare(a))

  const items: MonthlyClosureListRow[] = sortedDescending.map((mk) => {
    const existing = closureByMonth.get(mk)
    const data_count = dataCountByMonth.get(mk) ?? 0
    const application_count = pendingByMonth.get(mk) ?? 0
    const approved_count = approvedByMonth.get(mk) ?? 0
    const rejected_count = rejectedByMonth.get(mk) ?? 0

    if (existing) {
      return {
        ...existing,
        data_count,
        application_count,
        approved_count,
        rejected_count,
        isPendingMonth: false,
      }
    }

    return buildPendingClosureRow(
      tenantId,
      mk,
      data_count,
      application_count,
      approved_count,
      rejected_count,
    )
  })

  return { ok: true, items }
}
