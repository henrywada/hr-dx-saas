import { createClient } from '@/lib/supabase/server'
import { getOvertimeThresholds } from '@/utils/overtimeThresholds'
import { AnalysisDashboard } from './_components/AnalysisDashboard'

export const metadata = {
  title: '36協定 遵守状況ダッシュボード | HR-DX',
  description:
    '時間外・休日労働の上限規制（36協定）に対するリスクを部署・従業員単位で一覧管理するダッシュボードです。',
}

export default async function Page() {
  const supabase = await createClient()

  // 並列フェッチ
  const [thresholds, divisionsRes, employeesRes, overtimeRes, applicationsRes] =
    await Promise.all([
      // overtime_settings からしきい値を取得（未設定時は法定デフォルト値）
      getOvertimeThresholds(supabase),

      // 全部署（layer 昇順）
      supabase
        .from('divisions')
        .select('id, name, parent_id, layer')
        .order('layer', { ascending: true }),

      // activeな全従業員（division_id あり、システム管理者を除く）
      supabase
        .from('employees')
        .select('id, name, division_id')
        .eq('active_status', 'active')
        .not('division_id', 'is', null)
        .neq('name', 'SaaS管理者'),

      // 直近の月次残業集計
      supabase
        .from('monthly_employee_overtime')
        .select('employee_id, year_month, total_overtime_hours, approved_overtime_hours')
        .gte('year_month', '2024-01-01')
        .order('year_month', { ascending: true }),

      // 未集計のリアルタイム申請データ（承認済のみ）
      supabase
        .from('overtime_applications')
        .select('employee_id, work_date, requested_hours')
        .eq('status', '承認済')
        .gte('work_date', '2024-01-01'),
    ])

  const divisions = divisionsRes.data ?? []
  const employees = employeesRes.data ?? []

  // 1. 申請データを月次集計マップに変換
  const appMap = new Map<string, Map<string, number>>()
  for (const app of applicationsRes.data ?? []) {
    const ym = String(app.work_date).slice(0, 7)
    if (!appMap.has(app.employee_id)) appMap.set(app.employee_id, new Map())
    const empMap = appMap.get(app.employee_id)!
    empMap.set(ym, (empMap.get(ym) ?? 0) + (app.requested_hours ?? 0))
  }

  // 2. 最終的な行データを構築するマップ（キー: empId_ym）
  const finalRowsMap = new Map<
    string,
    { employee_id: string; year_month: string; total_overtime_hours: number }
  >()

  // まずサマリーテーブルを入れる
  for (const row of overtimeRes.data ?? []) {
    const ym = String(row.year_month).slice(0, 7)
    const key = `${row.employee_id}_${ym}`
    const val = Math.max(
      row.total_overtime_hours ?? 0,
      row.approved_overtime_hours ?? 0,
    )
    finalRowsMap.set(key, {
      employee_id: row.employee_id,
      year_month: ym,
      total_overtime_hours: val,
    })
  }

  // 3. 申請データをマージ（サマリーがない、または申請データの方が大きい場合は上書き）
  for (const [empId, empMap] of appMap) {
    for (const [ym, hours] of empMap) {
      const key = `${empId}_${ym}`
      const existing = finalRowsMap.get(key)
      if (!existing || hours > existing.total_overtime_hours) {
        finalRowsMap.set(key, {
          employee_id: empId,
          year_month: ym,
          total_overtime_hours: hours,
        })
      }
    }
  }

  const overtimeRows = Array.from(finalRowsMap.values())

  return (
    <AnalysisDashboard
      thresholds={thresholds}
      divisions={divisions}
      employees={employees}
      overtimeRows={overtimeRows}
    />
  )
}
