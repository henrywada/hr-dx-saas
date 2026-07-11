import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getDivisionConditionTrend } from '@/features/condition-checkin/queries'
import { DivisionConditionTrendView } from '@/features/condition-checkin/components/DivisionConditionTrendView'
import TenantBackLink from '@/components/common/TenantBackLink'

export const metadata = { title: '部署のコンディション傾向' }

export default async function ConditionTeamTrendPage() {
  const user = await getServerUser()
  if (!user) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  // is_manager=true かつ division_id を持つ従業員のみ対象。
  // hr/hr_manager/company_doctor/company_nurse/hsc は /adm/condition-trend で同等の機能を持つ。
  if (!user.is_manager) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-accent-teal px-4">
        <div className="max-w-sm rounded-2xl border border-[#e2e6ec] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#24292f]">あなたはこの画面を使えません</p>
          <p className="mt-2 text-xs text-[#57606a]">
            部署のコンディション傾向は上長向けの機能です。
          </p>
        </div>
      </div>
    )
  }

  if (!user.employee_id || !user.division_id) {
    redirect(APP_ROUTES.TENANT.CONDITION)
  }

  const trend = await getDivisionConditionTrend(user.division_id)

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-[1200px] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">部署のコンディション傾向</h1>
        <TenantBackLink />
      </div>
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <DivisionConditionTrendView data={trend} />
      </div>
    </div>
  )
}
