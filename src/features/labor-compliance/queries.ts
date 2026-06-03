import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import type {
  LaborComplianceBundle,
  OvertimeAlertDisplayRow,
  PaidLeaveProgressRow,
  Article36SubjectRow,
  DivisionHeatmapRow,
} from './types'
import { ALERT_SEVERITY, ALERT_TYPE_LABELS, getAlertSeverityLevel } from './types'

function periodMonthDate(yearMonth: string): string {
  return `${yearMonth}-01`
}

function lastDayOfMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${yearMonth}-${String(last).padStart(2, '0')}`
}

/** 指定月を終端とする過去12ヶ月の YYYY-MM-01 文字列リスト */
function last12PeriodMonths(yearMonth: string): string[] {
  const [y, m] = yearMonth.split('-').map(Number)
  const out: string[] = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(y, m - 1 - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    out.push(ym)
  }
  return out
}

/** 現在の年度開始月（4月）の YYYY-MM-DD */
function fiscalYearStart(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const fiscalYear = m >= 4 ? y : y - 1
  return `${fiscalYear}-04-01`
}

export async function getLaborComplianceBundle(
  yearMonth: string
): Promise<{ ok: true; data: LaborComplianceBundle } | { ok: false; error: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    return { ok: false, error: 'テナント情報が取得できません。ログインし直してください。' }
  }

  const supabase = await createClient()
  const tenantId = user.tenant_id

  try {
    // ① 従業員 + 部署一覧を取得
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select('id, name, employee_no, division_id, divisions(name)')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })
    if (empErr) return { ok: false, error: empErr.message }

    type EmpRow = {
      id: string
      name: string | null
      employee_no: string | null
      division_id: string | null
      divisions: { name: string } | null
    }
    const emps = (employees ?? []) as EmpRow[]
    const empMap = new Map(emps.map(e => [e.id, e]))

    // ② overtime_alerts（直近12ヶ月分）を取得
    const past12 = last12PeriodMonths(yearMonth)
    const oldestPeriodYm = past12[past12.length - 1].slice(0, 7)

    const { data: alerts, error: alertErr } = await supabase
      .from('overtime_alerts')
      .select('id, employee_id, alert_type, alert_value, triggered_at, resolved_at')
      .eq('tenant_id', tenantId)
      .gte('triggered_at', `${oldestPeriodYm}-01`)
      .order('triggered_at', { ascending: false })
    if (alertErr) return { ok: false, error: alertErr.message }

    const allAlerts = alerts ?? []

    // ③ 未解決アラートを表示行に変換（重大度降順）
    const unresolvedAlerts = allAlerts
      .filter(a => !a.resolved_at)
      .map((a): OvertimeAlertDisplayRow => {
        const emp = empMap.get(a.employee_id)
        return {
          id: a.id,
          employeeId: a.employee_id,
          employeeName: emp?.name?.trim() || '—',
          employeeNo: emp?.employee_no ?? null,
          divisionName: emp?.divisions?.name ?? '—',
          alertType: a.alert_type,
          alertTypeLabel: ALERT_TYPE_LABELS[a.alert_type] ?? a.alert_type,
          severityLevel: getAlertSeverityLevel(a.alert_type),
          triggeredAt: a.triggered_at,
          resolvedAt: a.resolved_at,
          alertValue: (a.alert_value as Record<string, unknown> | null) ?? null,
        }
      })
      .sort((a, b) => (ALERT_SEVERITY[b.alertType] ?? 0) - (ALERT_SEVERITY[a.alertType] ?? 0))

    // ④ 有休取得進捗：年度開始（4月）〜指定月末の is_holiday=true 日数を社員別に集計
    const fiscalStart = fiscalYearStart(yearMonth)
    const monthEnd = lastDayOfMonth(yearMonth)

    const { data: workRecords, error: wrErr } = await supabase
      .from('work_time_records')
      .select('employee_id, record_date, is_holiday')
      .eq('tenant_id', tenantId)
      .gte('record_date', fiscalStart)
      .lte('record_date', monthEnd)
      .eq('is_holiday', true)
    if (wrErr) return { ok: false, error: wrErr.message }

    const holidayCountByEmp = new Map<string, number>()
    for (const wr of workRecords ?? []) {
      holidayCountByEmp.set(wr.employee_id, (holidayCountByEmp.get(wr.employee_id) ?? 0) + 1)
    }

    const paidLeaveProgress: PaidLeaveProgressRow[] = emps.map(emp => {
      const taken = holidayCountByEmp.get(emp.id) ?? 0
      return {
        employeeId: emp.id,
        employeeName: emp.name?.trim() || '—',
        employeeNo: emp.employee_no ?? null,
        divisionName: emp.divisions?.name ?? '—',
        takenDays: taken,
        requiredDays: 5,
        atRisk: taken < 5,
      }
    })
    paidLeaveProgress.sort((a, b) => a.takenDays - b.takenDays)

    // ⑤ 36協定特別条項対象者：直近12ヶ月で月100h超アラートが1件以上 or 年360h超アラートあり
    const alertsByEmp = new Map<string, typeof allAlerts>()
    for (const a of allAlerts) {
      const list = alertsByEmp.get(a.employee_id) ?? []
      list.push(a)
      alertsByEmp.set(a.employee_id, list)
    }

    const article36Subjects: Article36SubjectRow[] = []
    for (const emp of emps) {
      const empAlerts = alertsByEmp.get(emp.id) ?? []
      const month100 = empAlerts.filter(a =>
        ['monthly_ot_100_exceeded', 'monthly_100_exceeded'].includes(a.alert_type)
      ).length
      const month45 = empAlerts.filter(a =>
        ['monthly_ot_45_exceeded', 'monthly_45_exceeded'].includes(a.alert_type)
      ).length
      const hasAnnual = empAlerts.some(a =>
        ['annual_ot_360_exceeded', 'yearly_360_exceeded'].includes(a.alert_type)
      )

      if (month100 > 0 || hasAnnual) {
        article36Subjects.push({
          employeeId: emp.id,
          employeeName: emp.name?.trim() || '—',
          employeeNo: emp.employee_no ?? null,
          divisionName: emp.divisions?.name ?? '—',
          monthOver100Count: month100,
          monthOver45Count: month45,
          hasAnnualExceeded: hasAnnual,
        })
      }
    }
    article36Subjects.sort((a, b) => b.monthOver100Count - a.monthOver100Count)

    // ⑥ 部署別ヒートマップ：指定月の overtime_monthly_stats を集計
    const { data: monthlyStats, error: msErr } = await supabase
      .from('overtime_monthly_stats')
      .select('employee_id, overtime_minutes')
      .eq('tenant_id', tenantId)
      .eq('period_month', periodMonthDate(yearMonth))
    if (msErr) return { ok: false, error: msErr.message }

    const otMinByEmp = new Map<string, number>()
    for (const s of monthlyStats ?? []) {
      otMinByEmp.set(s.employee_id, Number(s.overtime_minutes ?? 0))
    }

    const divMap = new Map<string, { divisionName: string; empIds: string[] }>()
    for (const emp of emps) {
      const divId = emp.division_id ?? '__none__'
      const divName = emp.divisions?.name ?? '未配属'
      const entry = divMap.get(divId) ?? { divisionName: divName, empIds: [] }
      entry.empIds.push(emp.id)
      divMap.set(divId, entry)
    }

    const unresolvedAlertEmpSet = new Set(unresolvedAlerts.map(a => a.employeeId))
    const paidLeaveAtRiskSet = new Set(
      paidLeaveProgress.filter(r => r.atRisk).map(r => r.employeeId)
    )

    const divisionHeatmap: DivisionHeatmapRow[] = Array.from(divMap.entries()).map(
      ([divId, { divisionName, empIds }]) => {
        const count = empIds.length
        const totalOt = empIds.reduce((acc, id) => acc + (otMinByEmp.get(id) ?? 0), 0)
        const avgOt = count > 0 ? Math.round(totalOt / count) : 0
        const legalRisk = empIds.filter(id => unresolvedAlertEmpSet.has(id)).length
        const paidLeaveCompliant = empIds.filter(id => !paidLeaveAtRiskSet.has(id)).length
        const plRate = count > 0 ? Math.round((paidLeaveCompliant / count) * 100) : 100
        return {
          divisionId: divId,
          divisionName,
          employeeCount: count,
          avgOvertimeMinutes: avgOt,
          legalRiskCount: legalRisk,
          paidLeaveComplianceRate: plRate,
        }
      }
    )
    divisionHeatmap.sort((a, b) => b.avgOvertimeMinutes - a.avgOvertimeMinutes)

    return {
      ok: true,
      data: {
        yearMonth,
        overtimeAlerts: unresolvedAlerts,
        paidLeaveProgress,
        article36Subjects,
        divisionHeatmap,
        summary: {
          unresolvedAlertCount: unresolvedAlerts.length,
          paidLeaveAtRiskCount: paidLeaveProgress.filter(r => r.atRisk).length,
          article36SubjectCount: article36Subjects.length,
          totalEmployees: emps.length,
        },
      },
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '不明なエラー'
    return { ok: false, error: msg }
  }
}
