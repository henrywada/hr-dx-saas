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
import { getKudosStatsByDivision } from '@/features/recognition/queries'
import { getTenantConditionSummary } from '@/features/condition-checkin/queries'
import { getPendingConsultationCount } from '@/features/consultation/queries'
import { getAllEventsForAdmin } from '@/features/internal-events/queries'
import {
  getUpcomingCareerAppointments,
  getCareerOverdueEmployees,
} from '@/features/career-discussions/queries'
import {
  getEvaluationCompletionRate,
  getEvaluationPeriods,
} from '@/features/evaluation/queries'
import { getTenantSkills } from '@/features/skill-map/queries'
import { summarizeQuestionnaires } from './summarize'
import type { AdmDashboardSummary } from './types'

export type AdmDashboardSummaryOptions = {
  /** URL クエリ evalPeriod で指定された評価期間 ID */
  evaluationPeriodId?: string
}

/** /adm メインダッシュボード用のデータを並列取得し、表示用に集約する */
export async function getAdmDashboardSummary(
  options?: AdmDashboardSummaryOptions
): Promise<AdmDashboardSummary | null> {
  const user = await getServerUser()
  if (!user?.tenant_id) return null

  const tenantId = user.tenant_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = (await createClient()) as any

  const [
    kpiResult,
    oneOnOneData,
    activeStressPeriod,
    publishedCourses,
    questionnaires,
    inProgressRes,
    kudosDivisionStats,
    conditionSummary,
    pendingConsultationCount,
    allEvents,
    evaluationPeriods,
    upcomingCareerAppointments,
    careerOverdueEmployees,
    tenantSkills,
  ] = await Promise.all([
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
    getKudosStatsByDivision(30),
    getTenantConditionSummary(30),
    getPendingConsultationCount(),
    getAllEventsForAdmin(),
    getEvaluationPeriods(supabase, tenantId),
    getUpcomingCareerAppointments(),
    getCareerOverdueEmployees(),
    getTenantSkills(supabase),
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

  const kudosCountLast30Days = kudosDivisionStats.reduce((sum, d) => sum + d.sentCount, 0)
  const todayIso = new Date().toISOString()
  const upcomingEventCount = allEvents.filter(e => e.event_date >= todayIso).length

  const periodOptions = evaluationPeriods.map(p => ({ id: p.id, name: p.name }))
  const requestedPeriodId = options?.evaluationPeriodId
  const selectedPeriod =
    (requestedPeriodId
      ? evaluationPeriods.find(p => p.id === requestedPeriodId)
      : undefined) ?? evaluationPeriods[0] ?? null

  let evaluationCompletionRatePercent: number | null = null
  if (selectedPeriod) {
    evaluationCompletionRatePercent = await getEvaluationCompletionRate(
      supabase,
      tenantId,
      selectedPeriod.id
    )
  }

  return {
    headcount: {
      activeEmployees: kpi.retention.totalActiveEmployees - kpi.retention.companyDoctorCount,
      companyDoctorCount: kpi.retention.companyDoctorCount,
      hiredThisMonth: kpi.retention.hiredThisMonth,
      turnoverRatePercent: kpi.retention.turnoverRatePercent,
      openJobPostings: kpi.recruit.openJobPostings,
    },
    pulseSurvey: {
      responseRatePercent: kpi.engagement.latestPulseResponseRate,
      score: kpi.engagement.latestPulseSurveyScore,
    },
    skillMap: {
      registeredSkillCount: tenantSkills.length,
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
    wellbeing: {
      kudosCountLast30Days,
      conditionAverageScore: conditionSummary.avg_score,
      conditionRespondentCount: conditionSummary.respondent_count,
      pendingConsultationCount,
      upcomingEventCount,
    },
    evaluation: {
      completionRatePercent: evaluationCompletionRatePercent,
      selectedPeriodId: selectedPeriod?.id ?? null,
      selectedPeriodName: selectedPeriod?.name ?? null,
      periods: periodOptions,
    },
    careerDiscussion: {
      ratePercent: kpi.development.careerDiscussionRatePercent,
      upcomingAppointmentCount: upcomingCareerAppointments.length,
      overdueEmployeeCount: careerOverdueEmployees.length,
    },
  }
}
