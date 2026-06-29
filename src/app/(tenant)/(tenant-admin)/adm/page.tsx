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
} from 'lucide-react'
import { KpiSummaryCard } from '@/features/hr-kpi/components/KpiSummaryCard'
import { DashboardSectionCard } from '@/features/adm-dashboard/components/DashboardSectionCard'
import { DashboardSectionGroupCard } from '@/features/adm-dashboard/components/DashboardSectionGroupCard'
import { ToolboxGrid } from '@/features/adm-dashboard/components/ToolboxGrid'
import { getAdmDashboardSummary } from '@/features/adm-dashboard/queries'
import { getPendingConsultationCount } from '@/features/consultation/queries'
import { ConsultationPendingAdminButton } from '@/features/consultation/components/ConsultationPendingAdminButton'
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

export default async function HrDashboardPage() {
  const [summary, pendingConsultationCount] = await Promise.all([
    getAdmDashboardSummary(),
    getPendingConsultationCount(),
  ])

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
          <ConsultationPendingAdminButton count={pendingConsultationCount} />
          <Link
            href={APP_ROUTES.TENANT.ADMIN_MANUAL}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#e2e6ec] bg-white px-3 py-1.5 text-xs font-medium text-[#161b22] shadow-xs transition-colors hover:bg-[#f6f8fa]"
          >
            <Book className="h-4 w-4" />
            マニュアル
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSummaryCard
          label="在籍社員数"
          value={`${summary.headcount.activeEmployees}`}
          sub={formatActiveEmployeesSub(summary.headcount.companyDoctorCount)}
          subClassName="text-gray-900"
          icon={<Users className="h-4 w-4" />}
          align="right"
        />
        <KpiSummaryCard
          label="今月入社"
          value={`${summary.headcount.hiredThisMonth}`}
          sub="名"
          icon={<UserPlus className="h-4 w-4" />}
          align="right"
        />
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
        <KpiSummaryCard
          label="採用中ポジション"
          value={`${summary.headcount.openJobPostings}`}
          sub="件"
          icon={<Briefcase className="h-4 w-4" />}
          align="right"
        />
      </div>

      <DashboardSectionGroupCard
        icon={<HeartHandshake className="h-4 w-4" />}
        title="サーベイ・ウェルビーイング"
      >
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
        />
        <DashboardSectionCard
          icon={<GraduationCap className="h-4 w-4" />}
          iconClassName="bg-emerald-50 text-emerald-600"
          title="スキル・能力向上"
          description="社員ごとのスキルマップ管理。研修履歴・資格取得状況、不足スキルのギャップ分析も。"
          href={APP_ROUTES.TENANT.ADMIN_SKILL_MAP}
          stats={[
            {
              label: '研修完了率',
              value: formatPercent(summary.skillDevelopment.elCompletionRatePercent),
            },
            {
              label: 'スキルギャップ率',
              value: formatPercent(summary.skillDevelopment.skillGapRatePercent),
            },
          ]}
        />
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
        />
        <DashboardSectionCard
          icon={<HeartHandshake className="h-4 w-4" />}
          iconClassName="bg-pink-50 text-pink-600"
          title="感謝・称賛"
          description="同僚への感謝・称賛メッセージを投稿。全社フィードでコミュニケーション活性度を可視化。"
          href={APP_ROUTES.TENANT.ADMIN_KUDOS_STATS}
          stats={[
            { label: '直近30日の送信件数', value: `${summary.wellbeing.kudosCountLast30Days}件` },
          ]}
        />
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
        <DashboardSectionCard
          icon={<MessageCircleHeart className="h-4 w-4" />}
          iconClassName="bg-teal-50 text-teal-600"
          title="悩み・相談窓口"
          description="匿名・記名どちらでも相談可能。産業医・人事が対応状況を一元管理。"
          href={APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE}
          stats={[{ label: '未対応', value: `${summary.wellbeing.pendingConsultationCount}件` }]}
        />
        <DashboardSectionCard
          icon={<PartyPopper className="h-4 w-4" />}
          iconClassName="bg-indigo-50 text-indigo-600"
          title="社内イベント・表彰"
          description="社内イベントの告知・参加表明、表彰の発表を管理。"
          href={APP_ROUTES.TENANT.ADMIN_EVENTS_AWARDS}
          stats={[{ label: '開催予定', value: `${summary.wellbeing.upcomingEventCount}件` }]}
        />
      </DashboardSectionGroupCard>

      <DashboardSectionGroupCard icon={<TrendingUp className="h-4 w-4" />} title="学習・成長">
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
        />
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
      </DashboardSectionGroupCard>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[#161b22]">
          <Wrench className="h-4 w-4" />
          ツールボックス
        </h2>
        <ToolboxGrid />
      </section>
    </div>
  )
}
