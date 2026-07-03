// src/features/executive-summary/queries.ts
import { getHrKpiBundle } from '@/features/hr-kpi/queries'
import { getTurnoverRiskSummary } from '@/features/turnover-risk/queries'
import { getEngagementDashboardData } from '@/features/engagement/queries'
import { buildAlertHighlights, buildKpiHeadlines } from './build-summary'
import type { ExecutiveSummaryData } from './types'

/** 経営者向け統合エグゼクティブサマリーのデータを並列取得し集約する */
export async function getExecutiveSummary(): Promise<
  { ok: true; data: ExecutiveSummaryData } | { ok: false; error: string }
> {
  const [kpiResult, turnoverRiskSummary, engagementData] = await Promise.all([
    getHrKpiBundle(),
    getTurnoverRiskSummary(),
    getEngagementDashboardData(),
  ])

  if (kpiResult.ok === false) {
    return { ok: false, error: kpiResult.error }
  }

  const engagementAlertDepartmentCount = engagementData.departments.filter(
    d => d.status === 'alert'
  ).length

  const highlights = buildAlertHighlights({
    turnoverRiskHighCount: turnoverRiskSummary.highCount,
    engagementAlertDepartmentCount,
    oneOnOneOverdueCount: engagementData.growthKpi.oneOnOneOverdueCount,
  })

  const kpiHeadlines = buildKpiHeadlines(kpiResult.data)

  return {
    ok: true,
    data: {
      highlights,
      kpiHeadlines,
      yearMonth: kpiResult.data.yearMonth,
      fetchedAt: kpiResult.data.fetchedAt,
    },
  }
}
