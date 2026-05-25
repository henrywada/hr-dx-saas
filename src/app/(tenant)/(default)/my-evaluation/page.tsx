import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getMyEvaluationSheets, getEvaluationPeriods } from '@/features/evaluation/queries'
import { MyEvaluationListClient } from './MyEvaluationListClient'

export const dynamic = 'force-dynamic'

export default async function MyEvaluationPage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const [sheets, periods] = await Promise.all([
    getMyEvaluationSheets(supabase, user.employee_id),
    getEvaluationPeriods(supabase, user.tenant_id!),
  ])

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 pb-6 pt-3 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-200 px-6 py-5">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">私の評価</h1>
            <p className="mt-1 text-sm text-gray-500">自己評価の入力・評価結果の確認ができます。</p>
          </header>
          <div className="p-6">
            <MyEvaluationListClient sheets={sheets} periods={periods} />
          </div>
        </div>
      </div>
    </div>
  )
}
