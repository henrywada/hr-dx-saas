// src/features/executive-summary/build-summary.ts
// クライアント側からも安全にインポートできる純粋な集約ロジック（Supabase呼び出しを含まない）
import { APP_ROUTES } from '@/config/routes'
import type { ExecutiveAlertHighlight, ExecutiveKpiHeadline } from './types'

export interface AlertHighlightCounts {
  turnoverRiskHighCount: number
  engagementAlertDepartmentCount: number
  oneOnOneOverdueCount: number
}

/** 3シグナルのハイライトカードを組み立てる（件数が1件以上あれば isAlert=true） */
export function buildAlertHighlights(counts: AlertHighlightCounts): ExecutiveAlertHighlight[] {
  return [
    {
      key: 'turnoverRisk',
      label: '離職ハイリスク',
      description: '離職予兆スコアが「高」の従業員数',
      count: counts.turnoverRiskHighCount,
      unit: '名',
      isAlert: counts.turnoverRiskHighCount > 0,
      href: APP_ROUTES.TENANT.ADMIN_TURNOVER_RISK,
    },
    {
      key: 'engagementAlert',
      label: 'エンゲージメントalert部署',
      description: '複合エンゲージメントスコアが alert 状態の部署数',
      count: counts.engagementAlertDepartmentCount,
      unit: '部署',
      isAlert: counts.engagementAlertDepartmentCount > 0,
      href: APP_ROUTES.TENANT.ADMIN_ENGAGEMENT,
    },
    {
      key: 'oneOnOneOverdue',
      label: '1on1未実施（30日超）',
      description: '直近30日以上1on1が実施されていない従業員数',
      count: counts.oneOnOneOverdueCount,
      unit: '名',
      isAlert: counts.oneOnOneOverdueCount > 0,
      href: APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE,
    },
  ]
}

/** getHrKpiBundle() の一部から、経営者向けKPI要点5指標を抜粋する */
export interface KpiHeadlineSource {
  retention: { turnoverRatePercent: number | null }
  engagement: { latestPulseSurveyScore: number | null }
  productivity: {
    avgOvertimeHoursThisMonth: number | null
    paidLeaveUtilizationPercent: number | null
  }
  development: { elCompletionRatePercent: number | null }
}

export function buildKpiHeadlines(kpi: KpiHeadlineSource): ExecutiveKpiHeadline[] {
  return [
    { label: '離職率', value: kpi.retention.turnoverRatePercent, unit: '%' },
    { label: 'エンゲージメントスコア', value: kpi.engagement.latestPulseSurveyScore, unit: '/5.0' },
    { label: '平均残業時間', value: kpi.productivity.avgOvertimeHoursThisMonth, unit: '時間' },
    { label: '有休取得率', value: kpi.productivity.paidLeaveUtilizationPercent, unit: '%' },
    { label: '育成完了率', value: kpi.development.elCompletionRatePercent, unit: '%' },
  ]
}
