import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getObjectiveDetail } from '@/features/okr/queries'
import { KeyResultList } from '@/features/okr/components/KeyResultList'
import { EvaluationLinkBadge } from '@/features/okr/components/EvaluationLinkBadge'
import {
  OBJECTIVE_OWNER_TYPE_LABELS,
  OBJECTIVE_STATUS_LABELS,
  OBJECTIVE_STATUS_COLORS,
} from '@/features/okr/types'

export const metadata = { title: 'OKR 目標詳細' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']
const ADMIN_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

interface Props {
  params: Promise<{ objectiveId: string }>
}

function progressBarColor(progress: number): string {
  if (progress >= 70) return 'bg-green-500'
  if (progress >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

export default async function ObjectiveDetailPage({ params }: Props) {
  const { objectiveId } = await params

  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const objective = await getObjectiveDetail(objectiveId)
  if (!objective) notFound()

  const isAdmin = ADMIN_ROLES.includes(user.appRole ?? '')
  const statusClass = OBJECTIVE_STATUS_COLORS[objective.status] ?? 'text-gray-600 bg-gray-100'

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* パスバー */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-6 py-2.5 text-sm text-gray-600">
          <Link
            href={APP_ROUTES.TENANT.ADMIN_OKR_DASHBOARD}
            className="hover:text-primary transition-colors"
          >
            OKR・目標管理
          </Link>
          <span>/</span>
          <span className="truncate max-w-xs">{objective.title}</span>
        </div>

        {/* カードヘッダー */}
        <div className="border-b border-gray-300 bg-gray-200 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {OBJECTIVE_OWNER_TYPE_LABELS[objective.owner_type]}
                </span>
                {objective.owner_name && (
                  <span className="text-xs text-gray-500">{objective.owner_name}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>
                  {OBJECTIVE_STATUS_LABELS[objective.status]}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">{objective.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {objective.period_label}（{objective.fiscal_year}年度）
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-3xl font-bold text-gray-900">{objective.progress}%</p>
              <p className="text-xs text-gray-400 mt-0.5">達成率</p>
            </div>
          </div>

          {/* 進捗バー */}
          <div className="mt-4 h-3 w-full rounded-full bg-gray-300">
            <div
              className={`h-3 rounded-full transition-all ${progressBarColor(objective.progress)}`}
              style={{ width: `${Math.min(100, objective.progress)}%` }}
            />
          </div>
        </div>

        {/* カード本文 */}
        <div className="space-y-6 p-6">
          {/* 説明 */}
          {objective.description && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                説明
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{objective.description}</p>
            </section>
          )}

          {/* 評価シート連動 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              評価連動
            </h2>
            <EvaluationLinkBadge
              objectiveId={objective.id}
              evaluationSheetId={objective.evaluation_sheet_id}
            />
          </section>

          {/* Key Results */}
          <section>
            <KeyResultList
              keyResults={objective.key_results}
              objectiveId={objective.id}
              isAdmin={isAdmin}
            />
          </section>

          {/* 子目標 */}
          {objective.children.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">子目標</h2>
              <div className="space-y-2">
                {objective.children.map(child => (
                  <Link
                    key={child.id}
                    href={APP_ROUTES.TENANT.ADMIN_OKR_DETAIL(child.id)}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 hover:border-primary/40 hover:bg-white transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {OBJECTIVE_OWNER_TYPE_LABELS[child.owner_type]}
                        </span>
                        {child.owner_name && (
                          <span className="text-xs text-gray-400">{child.owner_name}</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{child.title}</p>
                    </div>
                    <div className="shrink-0 ml-4 text-right">
                      <p className="text-sm font-bold text-gray-900">{child.progress}%</p>
                      <div className="mt-0.5 h-1.5 w-16 rounded-full bg-gray-200">
                        <div
                          className={`h-1.5 rounded-full ${progressBarColor(child.progress)}`}
                          style={{ width: `${Math.min(100, child.progress)}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
