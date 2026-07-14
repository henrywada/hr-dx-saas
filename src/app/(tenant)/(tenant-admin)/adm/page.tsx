import Link from 'next/link'
import {
  Users,
  UserPlus,
  TrendingDown,
  TrendingUp,
  Briefcase,
  HeartPulse,
  HeartHandshake,
  GraduationCap,
  MessageCircle,
  Activity,
  Book,
  BookOpen,
  ClipboardList,
  Wrench,
  Smile,
  MessageCircleHeart,
  PartyPopper,
  ClipboardCheck,
} from 'lucide-react'
import { KpiSummaryCard } from '@/features/hr-kpi/components/KpiSummaryCard'
import { DashboardSectionCard } from '@/features/adm-dashboard/components/DashboardSectionCard'
import { DashboardSectionGroupCard } from '@/features/adm-dashboard/components/DashboardSectionGroupCard'
import { ToolboxGrid } from '@/features/adm-dashboard/components/ToolboxGrid'
import { EvaluationDashboardCard } from '@/features/adm-dashboard/components/EvaluationDashboardCard'
import { AdmHrKpiLink } from '@/features/adm-dashboard/components/AdmHrKpiLink'
import { AdmKpiOverviewSection } from '@/features/adm-dashboard/components/AdmKpiOverviewSection'
import { getAdmDashboardSummary } from '@/features/adm-dashboard/queries'
import { getPendingConsultationCount } from '@/features/consultation/queries'
import { ConsultationPendingAdminButton } from '@/features/consultation/components/ConsultationPendingAdminButton'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getVisibleDashboardElementKeys,
  isDashboardElementVisible,
} from '@/features/dashboard-ui-visibility/queries'
import { APP_ROUTES } from '@/config/routes'

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

function formatPercentValue(value: number | null): string {
  return value === null ? '—' : `${value}`
}

function formatActiveEmployeesSub(companyDoctorCount: number): string {
  return companyDoctorCount === 0 ? '名' : `名（産業医：${companyDoctorCount}名）`
}

export default async function HrDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ evalPeriod?: string }>
}) {
  const { evalPeriod } = await searchParams
  const user = await getServerUser()
  const [summary, pendingConsultationCount, visibleKeys] = await Promise.all([
    getAdmDashboardSummary({ evaluationPeriodId: evalPeriod }),
    getPendingConsultationCount(),
    getVisibleDashboardElementKeys(user?.tenant_id, 'adm'),
  ])

  const v = (key: string) => isDashboardElementVisible(visibleKeys, key)

  if (!summary) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
        <p className="text-sm text-[#57606a]">
          テナント情報を取得できませんでした。再度ログインしてください。
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-[#161b22] sm:text-3xl">
          管理：人事ダッシュボード
        </h1>
        <div className="flex items-center gap-2">
          {v('adm.button.consultation_pending') && (
            <ConsultationPendingAdminButton count={pendingConsultationCount} />
          )}
          {v('adm.button.hr_kpi') && <AdmHrKpiLink variant="button" />}
          {v('adm.button.manual') && (
            <Link
              href={APP_ROUTES.TENANT.ADMIN_MANUAL}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs font-medium text-[#161b22] shadow-xs transition-colors hover:bg-[#f6f8fa]"
            >
              <Book className="h-4 w-4" />
              マニュアル
            </Link>
          )}
        </div>
      </div>

      <AdmKpiOverviewSection showAiAssistant={v('adm.button.ai_hr_assistant')}>
        {v('adm.kpi.headcount') && (
          <KpiSummaryCard
            label="在籍社員数"
            value={`${summary.headcount.activeEmployees}`}
            sub={formatActiveEmployeesSub(summary.headcount.companyDoctorCount)}
            subClassName="text-gray-900"
            icon={<Users className="h-4 w-4" />}
            align="right"
          />
        )}
        {v('adm.kpi.hired_this_month') && (
          <KpiSummaryCard
            label="今月入社"
            value={`${summary.headcount.hiredThisMonth}`}
            sub="名"
            icon={<UserPlus className="h-4 w-4" />}
            align="right"
          />
        )}
        {v('adm.kpi.turnover') && (
          <KpiSummaryCard
            label="離職率（年換算）"
            value={formatPercentValue(summary.headcount.turnoverRatePercent)}
            sub={summary.headcount.turnoverRatePercent === null ? undefined : '%'}
            subClassName="text-gray-900"
            status={
              summary.headcount.turnoverRatePercent !== null &&
              summary.headcount.turnoverRatePercent >= 10
                ? 'danger'
                : 'normal'
            }
            icon={<TrendingDown className="h-4 w-4" />}
            align="right"
          />
        )}
        {v('adm.kpi.open_positions') && (
          <KpiSummaryCard
            label="採用中ポジション"
            value={`${summary.headcount.openJobPostings}`}
            sub="件"
            icon={<Briefcase className="h-4 w-4" />}
            align="right"
          />
        )}
      </AdmKpiOverviewSection>

      {v('adm.section.wellbeing') && (
        <DashboardSectionGroupCard
          icon={<HeartHandshake className="h-4 w-4" />}
          title="サーベイ・ウェルビーイング"
        >
          {v('adm.card.pulse') && (
            <DashboardSectionCard
              icon={<HeartPulse className="h-4 w-4" />}
              iconClassName="bg-rose-50 text-rose-600"
              title="パルスサーベイ"
              description="毎週・隔週・月次で短いアンケートを自動配信。エンゲージメントスコアをリアルタイム追跡。"
              href={APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE}
              stats={[
                { label: '回答率', value: formatPercent(summary.pulseSurvey.responseRatePercent) },
                {
                  label: 'エンゲージメントスコア',
                  value: summary.pulseSurvey.score === null ? '—' : `${summary.pulseSurvey.score}`,
                },
              ]}
              kpiSection="engagement"
            />
          )}
          {v('adm.card.one_on_one') && (
            <DashboardSectionCard
              icon={<MessageCircle className="h-4 w-4" />}
              iconClassName="bg-sky-50 text-sky-600"
              title="1on1/フォローアップ"
              description="マネージャーと部下の1on1を記録・可視化。アジェンダテンプレート・アクションアイテム管理・次回日程スケジュール。"
              href={APP_ROUTES.TENANT.ADMIN_ONE_ON_ONE}
              stats={[
                { label: '直近30日の対象者数', value: `${summary.oneOnOne.sessionsLast30Days}件` },
                { label: '未実施', value: `${summary.oneOnOne.overdueCount}名` },
              ]}
            />
          )}
          {v('adm.card.stress_check') && (
            <DashboardSectionCard
              icon={<Activity className="h-4 w-4" />}
              iconClassName="bg-amber-50 text-amber-600"
              title="ストレスチェック"
              description="法定57項目を電子実施。高ストレス者の自動判定・産業医連携・集団分析レポートで労働局提出まで対応。"
              href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS}
              stats={[
                {
                  label: '実施率',
                  value: formatPercent(summary.stressCheck.submissionRatePercent),
                },
                { label: '高ストレス者', value: `${summary.stressCheck.highStressCount}名` },
              ]}
              kpiSection="engagement"
            />
          )}
          {v('adm.card.kudos') && (
            <DashboardSectionCard
              icon={<HeartHandshake className="h-4 w-4" />}
              iconClassName="bg-pink-50 text-pink-600"
              title="感謝・称賛"
              description="同僚への感謝・称賛メッセージを投稿。全社フィードでコミュニケーション活性度を可視化。"
              href={APP_ROUTES.TENANT.ADMIN_KUDOS_STATS}
              stats={[
                {
                  label: '直近30日の送信件数',
                  value: `${summary.wellbeing.kudosCountLast30Days}件`,
                },
              ]}
              kpiSection="engagement"
            />
          )}
          {v('adm.card.condition') && (
            <DashboardSectionCard
              icon={<Smile className="h-4 w-4" />}
              iconClassName="bg-orange-50 text-orange-600"
              title="コンディション記録"
              description="日々の気分・体調を1タップで記録。個人を特定しない匿名集計で組織の傾向を可視化。"
              href={APP_ROUTES.TENANT.ADMIN_CONDITION_TREND}
              stats={[
                {
                  label: '平均スコア',
                  value:
                    summary.wellbeing.conditionAverageScore === null
                      ? '—'
                      : `${summary.wellbeing.conditionAverageScore}`,
                },
                { label: '回答者数', value: `${summary.wellbeing.conditionRespondentCount}名` },
              ]}
            />
          )}
          {v('adm.card.consultation') && (
            <DashboardSectionCard
              icon={<MessageCircleHeart className="h-4 w-4" />}
              iconClassName="bg-teal-50 text-teal-600"
              title="悩み・相談窓口"
              description="匿名・記名どちらでも相談可能。産業医・人事が対応状況を一元管理。"
              href={APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE}
              stats={[
                { label: '未対応', value: `${summary.wellbeing.pendingConsultationCount}件` },
              ]}
            />
          )}
          {v('adm.card.events') && (
            <DashboardSectionCard
              icon={<PartyPopper className="h-4 w-4" />}
              iconClassName="bg-indigo-50 text-indigo-600"
              title="社内イベント・表彰"
              description="社内イベントの告知・参加表明、表彰の発表を管理。"
              href={APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS}
              stats={[{ label: '開催予定', value: `${summary.wellbeing.upcomingEventCount}件` }]}
            />
          )}
        </DashboardSectionGroupCard>
      )}

      {v('adm.section.growth') && (
        <DashboardSectionGroupCard icon={<TrendingUp className="h-4 w-4" />} title="学習・成長">
          {v('adm.card.skill_map') && (
            <DashboardSectionCard
              icon={<GraduationCap className="h-4 w-4" />}
              iconClassName="bg-emerald-50 text-emerald-600"
              title="スキル・能力向上"
              description="社員ごとのスキルマップ管理。完了率・ギャップ率の横断KPIは横断KPIページの育成セクションで確認できます。"
              href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP}
              stats={[{ label: '登録スキル', value: `${summary.skillMap.registeredSkillCount}件` }]}
              kpiSection="development"
            />
          )}
          {v('adm.card.evaluation') && (
            <EvaluationDashboardCard
              icon={<ClipboardCheck className="h-4 w-4" />}
              iconClassName="bg-blue-50 text-blue-600"
              completionRatePercent={summary.evaluation.completionRatePercent}
              selectedPeriodId={summary.evaluation.selectedPeriodId}
              periods={summary.evaluation.periods}
            />
          )}
          {v('adm.card.career') && (
            <DashboardSectionCard
              icon={<MessageCircleHeart className="h-4 w-4" />}
              iconClassName="bg-fuchsia-50 text-fuchsia-600"
              title="キャリア面談"
              description="従業員のキャリア志向・成長テーマを記録。後継者計画・評価サイクルと連動。"
              href={APP_ROUTES.TENANT.ADMIN_CAREER_DISCUSSIONS}
              stats={[
                {
                  label: '面談実施率',
                  value: formatPercent(summary.careerDiscussion.ratePercent),
                },
                {
                  label: '予約済み',
                  value: `${summary.careerDiscussion.upcomingAppointmentCount}件`,
                },
                {
                  label: '90日未実施',
                  value: `${summary.careerDiscussion.overdueEmployeeCount}名`,
                },
              ]}
              kpiSection="development"
            />
          )}
          {v('adm.card.elearning') && (
            <DashboardSectionCard
              icon={<BookOpen className="h-4 w-4" />}
              iconClassName="bg-violet-50 text-violet-600"
              title="eラーニング"
              description="コース作成・受講管理・修了証発行を一元化。スキル・能力向上と連動し、不足スキルに対応した研修を自動配信。"
              href={APP_ROUTES.TENANT.ADMIN_EL_COURSES}
              stats={[
                { label: '公開コース', value: `${summary.eLearning.publishedCourseCount}件` },
                { label: '受講中', value: `${summary.eLearning.inProgressAssignmentCount}件` },
              ]}
              kpiSection="development"
            />
          )}
          {v('adm.card.survey') && (
            <DashboardSectionCard
              icon={<ClipboardList className="h-4 w-4" />}
              iconClassName="bg-slate-100 text-slate-700"
              title="アンケート（汎用）"
              description="パルスサーベイ・ストレスチェック以外の自由形式アンケートを作成・配信・集計。入社後・退職理由・研修評価など。"
              href={APP_ROUTES.TENANT.ADMIN_SURVEY}
              stats={[
                { label: '実施中', value: `${summary.questionnaire.activeCount}件` },
                {
                  label: '平均回答率',
                  value: formatPercent(summary.questionnaire.averageResponseRatePercent),
                },
              ]}
            />
          )}
        </DashboardSectionGroupCard>
      )}

      {v('adm.section.toolbox') && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#161b22]">
            <Wrench className="h-4 w-4" />
            ツールボックス
          </h2>
          <ToolboxGrid />
        </section>
      )}
    </div>
  )
}
