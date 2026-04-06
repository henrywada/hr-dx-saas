import { NextResponse } from 'next/server'
import { requireAnalysisSession } from '@/app/api/analysis/_context'
import { toFiniteNumber } from '@/app/api/analysis/_coerce'

export type TrendItem = {
  year_month: string
  avg_overtime: number
  max_overtime: number
  total_employees: number
  violation_count: number
}

/**
 * 勤務状況分析：残業トレンド（月次）
 * 
 * RPC が見つからないエラーを回避するため、テーブルから直接取得して集計します。
 * 汎用的な期間指定に対応。
 */
export async function GET(request: Request) {
  const session = await requireAnalysisSession()
  if (session.ok === false) return session.response

  const { supabase, tenantId } = session

  const url = new URL(request.url)
  const startDateStr = url.searchParams.get('start_date')
  const endDateStr = url.searchParams.get('end_date')

  // デフォルト値: 過去12ヶ月（JST基準の年月）
  const now = new Date()
  const d1 = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  
  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const defaultStartDate = fmt(d1)
  const defaultEndDate = fmt(now)

  const start = startDateStr || defaultStartDate
  const end = endDateStr || defaultEndDate

  // ダッシュボードの表と同期させるため、有効な全従業員（退社済・未配属・ダミー管理者を除く）のIDリストを取得
  const { data: validEmps } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('active_status', 'active')
    .not('division_id', 'is', null)
    .neq('name', 'SaaS管理者')
  
  const validEmpIds = new Set(validEmps?.map(e => e.id) || [])

  // 終了月の翌月1日を計算し、.lt で未満検索にする
  const [eY, eM] = end.slice(0, 7).split('-').map(Number)
  const nextMonthDate = new Date(eY, eM, 1) // eM is 1-based but JS Date month is 0-based. Wait, new Date(eY, eM, 1) actually creates the 1st of the next month because month is 0-indexed, so passing eM (which is e.g. 4 for April) creates May 1st! This is perfect.
  const nextMonthPrefix = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  // 1. 月次サマリーデータの取得
  const { data: summaryRows, error: summaryError } = await supabase
    .from('monthly_employee_overtime')
    .select('year_month, total_overtime_hours, approved_overtime_hours, employee_id')
    .eq('tenant_id', tenantId)
    .gte('year_month', start.slice(0, 7) + '-01')
    .lt('year_month', nextMonthPrefix)

  if (summaryError) {
    console.error('fetch summary monthly_employee_overtime', summaryError)
    return NextResponse.json({ error: summaryError.message }, { status: 500 })
  }

  // 2. 申請データの取得
  const { data: appRows, error: appError } = await supabase
    .from('overtime_applications')
    .select('employee_id, work_date, requested_hours')
    .eq('tenant_id', tenantId)
    .eq('status', '承認済')
    .gte('work_date', start.slice(0, 7) + '-01')
    .lt('work_date', nextMonthPrefix)

  if (appError) {
    console.error('fetch overtime_applications', appError)
    return NextResponse.json({ error: appError.message }, { status: 500 })
  }

  // 月別・従業員別の残業時間マップを作成
  // Map<YYYY-MM, Map<employee_id, number>>
  const monthlyEmpHours = new Map<string, Map<string, number>>()

  // サマリーデータを追加
  for (const r of summaryRows ?? []) {
    if (!validEmpIds.has(r.employee_id)) continue
    const ym = typeof r.year_month === 'string' ? r.year_month.slice(0, 7) : ''
    if (!ym) continue
    if (!monthlyEmpHours.has(ym)) monthlyEmpHours.set(ym, new Map())
    const empMap = monthlyEmpHours.get(ym)!
    const h = Math.max(toFiniteNumber(r.total_overtime_hours), toFiniteNumber(r.approved_overtime_hours))
    empMap.set(r.employee_id, h)
  }

  // 申請データをマージ（サマリーより大きい場合のみ上書き）
  // 申請データは日別なので月ごとに合算
  const appMonthlySum = new Map<string, Map<string, number>>()
  for (const r of appRows ?? []) {
    if (!validEmpIds.has(r.employee_id)) continue
    const ym = typeof r.work_date === 'string' ? r.work_date.slice(0, 7) : ''
    if (!ym) continue
    if (!appMonthlySum.has(ym)) appMonthlySum.set(ym, new Map())
    const empSumMap = appMonthlySum.get(ym)!
    empSumMap.set(r.employee_id, (empSumMap.get(r.employee_id) ?? 0) + (r.requested_hours ?? 0))
  }

  for (const [ym, empSumMap] of appMonthlySum) {
    if (!monthlyEmpHours.has(ym)) monthlyEmpHours.set(ym, new Map())
    const empMainMap = monthlyEmpHours.get(ym)!
    for (const [empId, hours] of empSumMap) {
      const existing = empMainMap.get(empId) ?? 0
      if (hours > existing) {
        empMainMap.set(empId, hours)
      }
    }
  }

  // トレンド配列の生成
  const trend: TrendItem[] = []
  let currentYm = start.slice(0, 7)
  const targetEndYm = end.slice(0, 7)

  while (currentYm <= targetEndYm) {
    const empMap = monthlyEmpHours.get(currentYm)
    if (empMap && empMap.size > 0) {
      const hoursArray = Array.from(empMap.values())
      const sum = hoursArray.reduce((acc, h) => acc + h, 0)
      const max = Math.max(...hoursArray)
      const violationCount = hoursArray.filter((h) => h > 45).length

      trend.push({
        year_month: `${currentYm}-01`,
        avg_overtime: Math.round((sum / empMap.size) * 100) / 100,
        max_overtime: max,
        total_employees: empMap.size,
        violation_count: violationCount
      })
    } else {
      trend.push({
        year_month: `${currentYm}-01`,
        avg_overtime: 0,
        max_overtime: 0,
        total_employees: 0,
        violation_count: 0
      })
    }

    // 次の月へ
    const [y, m] = currentYm.split('-').map(Number)
    const nextDate = new Date(y, m, 1)
    const nextY = nextDate.getFullYear()
    const nextM = String(nextDate.getMonth() + 1).padStart(2, '0')
    currentYm = `${nextY}-${nextM}`
  }

  return NextResponse.json({ trend })
}
