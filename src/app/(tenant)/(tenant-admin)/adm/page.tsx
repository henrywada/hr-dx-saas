import {
  Users,
  UserPlus,
  TrendingDown,
  Briefcase,
  HeartPulse,
  GraduationCap,
  MessageCircle,
  Activity,
  BookOpen,
  ClipboardList,
  Wrench,
} from 'lucide-react'
import { KpiSummaryCard } from '@/features/hr-kpi/components/KpiSummaryCard'
import { DashboardSectionCard } from '@/features/adm-dashboard/components/DashboardSectionCard'
import { ToolboxGrid } from '@/features/adm-dashboard/components/ToolboxGrid'
import { getAdmDashboardSummary } from '@/features/adm-dashboard/queries'
import { APP_ROUTES } from '@/config/routes'

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`
}

export default async function HrDashboardPage() {
  const summary = await getAdmDashboardSummary()

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#161b22] sm:text-3xl">
          人事ダッシュボード
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiSummaryCard
          label="在籍社員数"
          value={`${summary.headcount.activeEmployees}`}
          sub="名"
          icon={<Users className="h-4 w-4" />}
        />
        <KpiSummaryCard
          label="今月入社"
          value={`${summary.headcount.hiredThisMonth}`}
          sub="名"
          icon={<UserPlus className="h-4 w-4" />}
        />
        <KpiSummaryCard
          label="離職率（年換算）"
          value={formatPercent(summary.headcount.turnoverRatePercent)}
          status={
            summary.headcount.turnoverRatePercent !== null &&
            summary.headcount.turnoverRatePercent >= 10
              ? 'danger'
              : 'normal'
          }
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <KpiSummaryCard
          label="採用中ポジション"
          value={`${summary.headcount.openJobPostings}`}
          sub="件"
          icon={<Briefcase className="h-4 w-4" />}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#161b22]">サーベイ・ウェルビーイング</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DashboardSectionCard
            icon={<HeartPulse className="h-4 w-4" />}
            iconClassName="bg-rose-50 text-rose-600"
            title="パルスサーベイ"
            description="毎週・隔週・月次で短いアンケートを自動配信。eNPS・エンゲージメントスコアをリアルタイム追跡。"
            href={APP_ROUTES.TENANT.ADMIN_TENANT_QUESTIONNAIRE}
            stats={[
              { label: '回答率', value: formatPercent(summary.pulseSurvey.responseRatePercent) },
              {
                label: 'eNPS',
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
              { label: '今月実施件数', value: `${summary.oneOnOne.sessionsLast30Days}件` },
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
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-[#161b22]">学習・成長</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        </div>
      </section>

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
