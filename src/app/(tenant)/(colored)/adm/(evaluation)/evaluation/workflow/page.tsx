import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getEvaluationPeriods } from '@/features/evaluation/queries'
import {
  getWorkflowPhaseCounts,
  getPendingEmployees,
  getReminderHistory,
} from '@/features/evaluation/workflow-queries'
import { WorkflowDashboard } from './components/WorkflowDashboard'

export const dynamic = 'force-dynamic'

export default async function EvaluationWorkflowPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const periods = await getEvaluationPeriods(supabase, user.tenant_id!)

  // アクティブな期間（closed / confirmed 以外で最新のもの）を自動選択
  const activePeriod =
    periods.find(p => p.status !== 'confirmed' && p.status !== 'closed') ?? periods[0] ?? null

  if (!activePeriod) {
    return (
      <div className="min-h-full bg-gray-50">
        <div className="w-full">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-300 bg-gray-200 px-6 py-5">
              <h1 className="text-[1.35rem] font-bold text-gray-800 sm:text-[1.65rem]">
                評価ワークフロー管理
              </h1>
            </header>
            <div className="p-6">
              <p className="text-sm text-gray-500">
                有効な評価期間がありません。先に評価期間を作成してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const [phaseCounts, pendingEmployees, reminderHistory] = await Promise.all([
    getWorkflowPhaseCounts(supabase, user.tenant_id!, activePeriod.id),
    getPendingEmployees(supabase, user.tenant_id!, activePeriod.id, activePeriod),
    getReminderHistory(supabase, user.tenant_id!, activePeriod.id),
  ])

  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="relative border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <div className="min-w-0 pt-0.5">
                <h1 className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-[1.35rem] font-bold leading-snug tracking-tight text-transparent sm:text-[1.65rem]">
                  評価ワークフロー管理
                </h1>
                <div
                  className="mt-1.5 h-1 w-12 rounded-full bg-linear-to-r from-primary to-primary/60 sm:w-14"
                  aria-hidden
                />
                <p className="mt-2 max-w-3xl text-sm leading-snug text-gray-700">
                  フェーズ進捗・未提出者の確認と一括催促を行います。
                </p>
              </div>
            </div>
          </header>
          <div className="p-6">
            <WorkflowDashboard
              periods={periods}
              activePeriod={activePeriod}
              phaseCounts={phaseCounts}
              pendingEmployees={pendingEmployees}
              reminderHistory={reminderHistory}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
