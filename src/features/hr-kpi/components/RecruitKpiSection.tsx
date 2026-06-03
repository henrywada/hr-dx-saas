'use client'

import { Users, Briefcase, TrendingUp, CheckCircle } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { RecruitKpi } from '../types'

interface Props {
  kpi: RecruitKpi
}

export function RecruitKpiSection({ kpi }: Props) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <Briefcase size={16} className="text-primary" />
        採用
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiSummaryCard
          label="今月の応募数"
          value={`${kpi.applicantsThisMonth}件`}
          icon={<Users size={14} />}
          status="info"
        />
        <KpiSummaryCard
          label="選考通過率"
          value={kpi.passThroughRate != null ? `${kpi.passThroughRate}%` : 'データなし'}
          sub="応募→内定・入社"
          icon={<TrendingUp size={14} />}
          status={kpi.passThroughRate != null && kpi.passThroughRate >= 10 ? 'normal' : 'warning'}
        />
        <KpiSummaryCard
          label="充足率"
          value={kpi.fillRate != null ? `${kpi.fillRate}%` : 'データなし'}
          sub="入社済み / 公開求人数"
          icon={<CheckCircle size={14} />}
          status={kpi.fillRate != null && kpi.fillRate >= 50 ? 'normal' : 'warning'}
        />
        <KpiSummaryCard
          label="公開中求人数"
          value={`${kpi.openJobPostings}件`}
          icon={<Briefcase size={14} />}
          status="info"
        />
      </div>
    </section>
  )
}
