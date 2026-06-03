'use client'

import { BookOpen, Target, TrendingUp } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { DevelopmentKpi } from '../types'

interface Props {
  kpi: DevelopmentKpi
}

export function DevelopmentKpiSection({ kpi }: Props) {
  const elStatus =
    kpi.elCompletionRatePercent == null
      ? 'info'
      : kpi.elCompletionRatePercent >= 80
        ? 'normal'
        : kpi.elCompletionRatePercent >= 50
          ? 'warning'
          : 'danger'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <BookOpen size={16} className="text-primary" />
        育成
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiSummaryCard
          label="スキルギャップ率"
          value={
            kpi.skillGapRatePercent != null
              ? `${kpi.skillGapRatePercent}%`
              : 'データなし'
          }
          sub="スキル割り当て済み従業員"
          icon={<Target size={14} />}
          status={
            kpi.skillGapRatePercent == null
              ? 'info'
              : kpi.skillGapRatePercent <= 20
                ? 'normal'
                : kpi.skillGapRatePercent <= 50
                  ? 'warning'
                  : 'danger'
          }
        />
        <KpiSummaryCard
          label="eラーニング完了率"
          value={
            kpi.elCompletionRatePercent != null
              ? `${kpi.elCompletionRatePercent}%`
              : 'データなし'
          }
          sub="全割り当て累計"
          icon={<BookOpen size={14} />}
          status={elStatus}
        />
        <KpiSummaryCard
          label="eラーニング割り当て総数"
          value={`${kpi.activeElAssignments}件`}
          sub="累計"
          icon={<TrendingUp size={14} />}
          status="info"
        />
      </div>
    </section>
  )
}
