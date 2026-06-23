import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getEvaluationPeriods,
  getEvaluationSheets,
  getEvaluationTemplates,
  getEmployeesForEvaluation,
} from '@/features/evaluation/queries'
import { EvalSheetsClient } from './EvalSheetsClient'

export const dynamic = 'force-dynamic'

export default async function EvaluationAdminPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const [periods, templates, employees] = await Promise.all([
    getEvaluationPeriods(supabase, user.tenant_id!),
    getEvaluationTemplates(supabase, user.tenant_id!),
    getEmployeesForEvaluation(supabase, user.tenant_id!),
  ])

  const activePeriodId = periods.find(p => p.status !== 'confirmed' && p.status !== 'closed')?.id

  const sheets = activePeriodId
    ? await getEvaluationSheets(supabase, user.tenant_id!, activePeriodId)
    : []

  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="relative border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <div className="min-w-0 pt-0.5">
                <h1 className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-[1.35rem] font-bold leading-snug tracking-tight text-transparent sm:text-[1.65rem]">
                  評価シート管理
                </h1>
                <div
                  className="mt-1.5 h-1 w-12 rounded-full bg-linear-to-r from-primary to-primary/60 sm:w-14"
                  aria-hidden
                />
                <p className="mt-2 max-w-3xl text-sm leading-snug text-gray-700">
                  評価シートの生成・フロー進捗の確認を行います。
                </p>
              </div>
            </div>
          </header>
          <div className="p-6">
            <EvalSheetsClient
              periods={periods}
              templates={templates}
              employees={employees}
              initialSheets={sheets}
              initialPeriodId={activePeriodId ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
