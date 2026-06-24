import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getHrKpiBundle } from '@/features/hr-kpi/queries'
import { getOneOnOneDashboardData } from '@/features/one-on-one/queries'
import {
  getActiveStressCheckPeriod,
  getProgressStats,
  getGroupAnalysisData,
} from '@/features/adm/stress-check/queries'
import { getCourses } from '@/features/e-learning/queries'
import { getQuestionnaires } from '@/features/questionnaire/queries'
import { summarizeQuestionnaires } from './summarize'
import type { AdmDashboardSummary } from './types'

/** /adm メインダッシュボード用のデータを並列取得し、表示用に集約する */
export async function getAdmDashboardSummary(): Promise<AdmDashboardSummary | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const tenantId = user.tenant_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [kpiResult, oneOnOneData, activeStressPeriod, publishedCourses, questionnaires, inProgressRes] =
    await Promise.all([
      getHrKpiBundle(),
      getOneOnOneDashboardData(),
      getActiveStressCheckPeriod(tenantId),
      getCourses({ status: 'published' }),
      getQuestionnaires(tenantId),
      supabase
        .from('el_assignments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('completed_at', null),
    ])

  if (!kpiResult.ok) return null
  const kpi = kpiResult.data

  let stressSubmissionRatePercent: number | null = null
  let highStressCount = 0

  if (activeStressPeriod?.id) {
    // stress_check_results への直接集計は RLS（同意済みかつ hr/hr_manager ロールのみ可視）により
    // 件数が過小評価されるため、マスキング済みの集団分析ビューから高ストレス者数を算出する
    const [progress, groupAnalysis] = await Promise.all([
      getProgressStats(tenantId, activeStressPeriod.id),
      getGroupAnalysisData(tenantId, activeStressPeriod.id),
    ])
    stressSubmissionRatePercent = progress.submissionRate
    highStressCount = Math.round(
      (groupAnalysis.summary.overallHighStressRate / 100) * groupAnalysis.summary.totalRespondents
    )
  }

  const questionnaireSummary = summarizeQuestionnaires(questionnaires)

  return {
    headcount: {
      activeEmployees: kpi.retention.totalActiveEmployees,
      hiredThisMonth: kpi.retention.hiredThisMonth,
      turnoverRatePercent: kpi.retention.turnoverRatePercent,
      openJobPostings: kpi.recruit.openJobPostings,
    },
    pulseSurvey: {
      responseRatePercent: kpi.engagement.latestPulseResponseRate,
      score: kpi.engagement.latestPulseSurveyScore,
    },
    skillDevelopment: {
      elCompletionRatePercent: kpi.development.elCompletionRatePercent,
      skillGapRatePercent: kpi.development.skillGapRatePercent,
    },
    oneOnOne: {
      sessionsLast30Days: oneOnOneData.totalSessionsLast30Days,
      overdueCount: oneOnOneData.overdueEmployees.length,
    },
    stressCheck: {
      submissionRatePercent: stressSubmissionRatePercent,
      highStressCount,
    },
    eLearning: {
      publishedCourseCount: publishedCourses.length,
      inProgressAssignmentCount: inProgressRes.count ?? 0,
    },
    questionnaire: questionnaireSummary,
  }
}
