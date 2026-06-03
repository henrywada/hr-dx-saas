'use client'

import { Clock, Sun, AlertTriangle } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { ProductivityKpi } from '../types'

interface Props {
  kpi: ProductivityKpi
}

export function ProductivityKpiSection({ kpi }: Props) {
  const overtimeStatus =
    kpi.avgOvertimeHoursThisMonth == null
      ? 'info'
      : kpi.avgOvertimeHoursThisMonth >= 40
        ? 'danger'
        : kpi.avgOvertimeHoursThisMonth >= 25
          ? 'warning'
          : 'normal'

  const leaveStatus =
    kpi.paidLeaveUtilizationPercent == null
      ? 'info'
      : kpi.paidLeaveUtilizationPercent >= 70
        ? 'normal'
        : kpi.paidLeaveUtilizationPercent >= 50
          ? 'warning'
          : 'danger'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <Clock size={16} className="text-primary" />
        生産性・労務
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiSummaryCard
          label="平均残業時間（当月）"
          value={
            kpi.avgOvertimeHoursThisMonth != null
              ? `${kpi.avgOvertimeHoursThisMonth}時間`
              : 'データなし'
          }
          sub="1人あたり月間"
          icon={<Clock size={14} />}
          status={overtimeStatus}
        />
        <KpiSummaryCard
          label="有休取得率"
          value={
            kpi.paidLeaveUtilizationPercent != null
              ? `${kpi.paidLeaveUtilizationPercent}%`
              : 'データなし'
          }
          sub="当年度累計"
          icon={<Sun size={14} />}
          status={leaveStatus}
        />
        <KpiSummaryCard
          label="36協定特別条項対象者"
          value={`${kpi.article36SubjectCount}名`}
          sub="当月・未解消"
          icon={<AlertTriangle size={14} />}
          status={kpi.article36SubjectCount > 0 ? 'danger' : 'normal'}
        />
      </div>
    </section>
  )
}
