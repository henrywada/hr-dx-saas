import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getActiveStressCheckPeriod,
  listActiveStressCheckPeriods,
  getProgressStats,
} from '@/features/adm/stress-check/queries'
import { listDivisionEstablishments } from '@/features/adm/division-establishments/queries'
import SummaryCards from '@/features/adm/stress-check/components/SummaryCards'
import EstablishmentProgressChart from '@/features/adm/stress-check/components/EstablishmentProgressChart'
import EstablishmentProgressTable from '@/features/adm/stress-check/components/EstablishmentProgressTable'
import ReminderAction from '@/features/adm/stress-check/components/ReminderAction'
import { ClipboardCheck, Building2 } from 'lucide-react'
import Link from 'next/link'
import TenantBackLink from '@/components/common/TenantBackLink'
import type {
  DepartmentStat,
  EstablishmentProgressTableRow,
} from '@/features/adm/stress-check/types'

type Props = {
  searchParams: Promise<{ period_id?: string }>
}

export default async function StressCheckProgressPage({ searchParams }: Props) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const sParams = await searchParams
  const activePeriods = await listActiveStressCheckPeriods(user.tenant_id)
  const fallbackPeriod = await getActiveStressCheckPeriod(user.tenant_id)

  // period_id 指定があればそれを優先（実施中一覧に含まれる場合のみ）
  const selectedFromQuery = sParams.period_id
    ? activePeriods.find(p => p.id === sParams.period_id)
    : undefined
  const period = selectedFromQuery ?? fallbackPeriod ?? activePeriods[0] ?? null

  // 期間が存在しない場合
  if (!period) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <ClipboardCheck className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-600">
            実施中のストレスチェックがありません
          </p>
          <p className="text-sm text-gray-400 mt-2">ストレスチェック期間を登録してください。</p>
        </div>
      </div>
    )
  }

  // 2. 進捗統計の取得（受検完了は提出レコードを集計。app_role による除外はしない）
  const stats = await getProgressStats(user.tenant_id, period.id)

  const establishments = stats.establishments ?? []

  const { establishments: divisionEstablishmentRows } = await listDivisionEstablishments(
    user.tenant_id
  )
  const periodByEstablishmentId = new Map(
    divisionEstablishmentRows.map(row => [row.id, row.stress_check_period_list])
  )

  const establishmentTableRows: EstablishmentProgressTableRow[] = establishments.map(est => ({
    ...est,
    stressCheckPeriod:
      est.id === 'unassigned'
        ? null
        : (periodByEstablishmentId.get(est.id) ??
          (stats.establishmentSource === 'period_divisions' ? period : null)),
  }))

  const chartEstablishments: DepartmentStat[] = establishments
    .filter(d => d.submitted + d.notSubmitted > 0)
    .map(d => ({
      id: d.id,
      parent_id: null,
      name: d.name,
      submitted: d.submitted,
      notSubmitted: d.notSubmitted,
      inProgress: d.inProgress,
      rate: d.rate,
    }))

  return (
    <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-bottom-4">
      {/* ページヘッダー */}
      <PageHeader />

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS}
          className="text-blue-600 hover:underline font-medium"
        >
          集団分析ダッシュボード
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_MNT_SETS}
          className="text-blue-600 hover:underline font-medium"
        >
          実施（期間・対象部署・対象者）の管理
        </Link>
        <span className="text-gray-300">|</span>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
          className="text-blue-600 hover:underline font-medium"
        >
          拠点（事業場）マスタ（分析用に設定）
        </Link>
      </div>

      {/* 実施期間の明示・切替（複数期間が重なると最新だけ見えて取り違えるため） */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">表示中の実施期間</p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">{period.title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {String(period.start_date).split('T')[0]} 〜 {String(period.end_date).split('T')[0]}
          </p>
        </div>
        {activePeriods.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {activePeriods.map(p => {
              const selected = p.id === period.id
              return (
                <Link
                  key={p.id}
                  href={`${APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_PROGRESS}?period_id=${p.id}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selected
                      ? 'bg-[#FD7601] text-white border-[#FD7601]'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.title}
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* サマリーカード */}
      <SummaryCards
        totalEmployees={stats.totalEmployees}
        submittedCount={stats.submittedCount}
        notSubmittedCount={stats.notSubmittedCount}
        consentCount={stats.consentCount}
        submissionRate={stats.submissionRate}
        consentRate={stats.consentRate}
      />

      {/* 拠点別進捗 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1.5 h-5 bg-linear-to-b from-teal-500 to-emerald-600 rounded-full" />
            拠点別 受検進捗
          </h2>
          <Link
            href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
            className="text-xs text-blue-600 hover:underline"
          >
            拠点マスタを編集
          </Link>
        </div>
        {establishments.length > 0 ? (
          <>
            <div className="px-6 pt-4 text-xs text-gray-400">
              {stats.establishmentSource === 'period_divisions' ? (
                <>
                  実施グループの対象部署単位で進捗を表示しています。事業場単位で集計する場合は
                  <Link
                    href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
                    className="mx-1 text-blue-600 hover:underline"
                  >
                    拠点マスタ
                  </Link>
                  を登録してください。
                </>
              ) : (
                <>拠点マスタで登録した事業場単位で、対象者・受検済み・未受検を確認できます。</>
              )}{' '}
              <span className="font-bold text-blue-600">青</span>＝受検者数、
              <span className="font-bold text-gray-500">灰</span>＝未受検者（全体）
            </div>
            <div className="p-4">
              <EstablishmentProgressChart data={chartEstablishments} />
            </div>
            <div className="border-t border-gray-100">
              <EstablishmentProgressTable periodId={period.id} rows={establishmentTableRows} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="bg-teal-50 p-4 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-base font-semibold text-gray-700">
              表示できる拠点・対象部署がありません
            </p>
            <p className="text-sm text-gray-400 mt-2 max-w-md mx-auto">
              まず実施グループで対象部署を設定するか、拠点マスタで事業場を登録してください。
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_MNT_SETS}
                className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                実施グループを設定
              </Link>
              <Link
                href={APP_ROUTES.TENANT.ADMIN_DIVISION_ESTABLISHMENTS}
                className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                拠点マスタを登録
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* リマインドアクション */}
      <ReminderAction
        periodId={period.id}
        notSubmittedCount={stats.notSubmittedCount}
        establishmentOptions={establishments.map(e => ({
          id: e.id,
          name: e.name,
          notSubmittedCount: e.notSubmitted,
        }))}
      />
    </div>
  )
}

/** ページヘッダー */
function PageHeader() {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="relative pl-5 min-w-0">
        <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-linear-to-b from-blue-500 to-violet-500 rounded-full" />
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
          ストレスチェック進捗管理
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-medium pl-0.5">
          拠点ごとの受検状況をリアルタイムで確認
        </p>
      </div>
      <TenantBackLink className="self-start shrink-0" />
    </div>
  )
}
