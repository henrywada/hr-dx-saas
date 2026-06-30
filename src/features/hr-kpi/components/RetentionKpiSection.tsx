'use client'

import { UserMinus, Users, Clock } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { RetentionKpi } from '../types'

interface Props {
  kpi: RetentionKpi
}

function formatTenure(months: number | null): string {
  if (months == null) return 'データなし'
  const y = Math.floor(months / 12)
  const m = Math.round(months % 12)
  return y > 0 ? `${y}年${m}ヶ月` : `${m}ヶ月`
}

export function RetentionKpiSection({ kpi }: Props) {
  const turnoverStatus =
    kpi.turnoverRatePercent == null
      ? 'info'
      : kpi.turnoverRatePercent >= 10
        ? 'danger'
        : kpi.turnoverRatePercent >= 5
          ? 'warning'
          : 'normal'

  return (
    <section id="retention">
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <UserMinus size={16} className="text-primary" />
        定着
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiSummaryCard
          label="在籍従業員数"
          value={`${kpi.totalActiveEmployees}名`}
          icon={<Users size={14} />}
          status="info"
        />
        <KpiSummaryCard
          label="直近12ヶ月の退職者数"
          value={`${kpi.turnoverCountLast12Months}名`}
          icon={<UserMinus size={14} />}
          status={kpi.turnoverCountLast12Months > 0 ? 'warning' : 'normal'}
        />
        <KpiSummaryCard
          label="離職率（直近12ヶ月）"
          value={kpi.turnoverRatePercent != null ? `${kpi.turnoverRatePercent}%` : 'データなし'}
          icon={<UserMinus size={14} />}
          status={turnoverStatus}
        />
        <KpiSummaryCard
          label="平均在籍年数"
          value={formatTenure(kpi.avgTenureMonths)}
          icon={<Clock size={14} />}
          status="info"
        />
      </div>
    </section>
  )
}
