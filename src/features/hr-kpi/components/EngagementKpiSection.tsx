'use client'

import { Smile, MessageSquare, Activity } from 'lucide-react'
import { KpiSummaryCard } from './KpiSummaryCard'
import type { EngagementKpi } from '../types'

interface Props {
  kpi: EngagementKpi
}

export function EngagementKpiSection({ kpi }: Props) {
  const pulseStatus =
    kpi.latestPulseSurveyScore == null
      ? 'info'
      : kpi.latestPulseSurveyScore >= 3.5
        ? 'normal'
        : kpi.latestPulseSurveyScore >= 2.5
          ? 'warning'
          : 'danger'

  const stressStatus =
    kpi.highStressRatePercent == null
      ? 'info'
      : kpi.highStressRatePercent >= 20
        ? 'danger'
        : kpi.highStressRatePercent >= 10
          ? 'warning'
          : 'normal'

  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <Smile size={16} className="text-primary" />
        エンゲージメント
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiSummaryCard
          label="パルスサーベイ平均スコア"
          value={
            kpi.latestPulseSurveyScore != null
              ? `${kpi.latestPulseSurveyScore} / 5.0`
              : 'データなし'
          }
          sub="直近期間"
          icon={<MessageSquare size={14} />}
          status={pulseStatus}
        />
        <KpiSummaryCard
          label="パルスサーベイ回答率"
          value={
            kpi.latestPulseResponseRate != null
              ? `${kpi.latestPulseResponseRate}%`
              : 'データなし'
          }
          sub="直近期間"
          icon={<MessageSquare size={14} />}
          status={
            kpi.latestPulseResponseRate == null
              ? 'info'
              : kpi.latestPulseResponseRate >= 70
                ? 'normal'
                : 'warning'
          }
        />
        <KpiSummaryCard
          label="高ストレス率"
          value={
            kpi.highStressRatePercent != null
              ? `${kpi.highStressRatePercent}%`
              : 'データなし'
          }
          sub="直近ストレスチェック"
          icon={<Activity size={14} />}
          status={stressStatus}
        />
      </div>
    </section>
  )
}
