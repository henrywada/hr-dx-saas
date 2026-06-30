'use client'

import { Smile, MessageSquare, Activity, Heart, CalendarDays } from 'lucide-react'
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
    <section id="engagement">
      <h2 className="mb-3 text-base font-semibold text-gray-700 flex items-center gap-2">
        <Smile size={16} className="text-primary" />
        エンゲージメント
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
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
            kpi.latestPulseResponseRate != null ? `${kpi.latestPulseResponseRate}%` : 'データなし'
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
          value={kpi.highStressRatePercent != null ? `${kpi.highStressRatePercent}%` : 'データなし'}
          sub="直近ストレスチェック"
          icon={<Activity size={14} />}
          status={stressStatus}
        />
        <KpiSummaryCard
          label="Kudos件数（30日）"
          value={`${kpi.kudosCountLast30Days}件`}
          sub="感謝・称賛"
          icon={<Heart size={14} />}
          status={kpi.kudosCountLast30Days > 0 ? 'normal' : 'info'}
        />
        <KpiSummaryCard
          label="Kudos送信者数"
          value={`${kpi.kudosActiveSendersLast30Days}名`}
          sub={
            kpi.kudosSenderRatePercent != null
              ? `在籍比 ${kpi.kudosSenderRatePercent}%`
              : '直近30日'
          }
          icon={<Heart size={14} />}
          status={
            kpi.kudosSenderRatePercent == null
              ? 'info'
              : kpi.kudosSenderRatePercent >= 30
                ? 'normal'
                : kpi.kudosSenderRatePercent >= 10
                  ? 'warning'
                  : 'danger'
          }
        />
        <KpiSummaryCard
          label="イベントRSVP回答率"
          value={
            kpi.eventRsvpResponseRatePercent != null
              ? `${kpi.eventRsvpResponseRatePercent}%`
              : 'データなし'
          }
          sub={`直近90日 ${kpi.eventsLast90Days}件`}
          icon={<CalendarDays size={14} />}
          status={
            kpi.eventRsvpResponseRatePercent == null
              ? 'info'
              : kpi.eventRsvpResponseRatePercent >= 70
                ? 'normal'
                : 'warning'
          }
        />
      </div>
    </section>
  )
}
