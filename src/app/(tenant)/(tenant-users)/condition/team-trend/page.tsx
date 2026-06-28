import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getDivisionConditionTrend } from '@/features/condition-checkin/queries'
import { DivisionConditionTrendView } from '@/features/condition-checkin/components/DivisionConditionTrendView'

export const metadata = { title: '部署のコンディション傾向' }

export default async function ConditionTeamTrendPage() {
  const user = await getServerUser()
  // is_manager=true かつ division_id を持つ従業員のみ対象。
  // hr/hr_manager/company_doctor/company_nurse/hsc は /adm/condition-trend で同等の機能を持つ。
  if (!user?.employee_id || !user.is_manager || !user.division_id) {
    redirect(APP_ROUTES.TENANT.CONDITION)
  }

  const trend = await getDivisionConditionTrend(user.division_id)

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-[1200px] space-y-4">
      <h1 className="text-sm font-semibold text-slate-900">部署のコンディション傾向</h1>
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        <DivisionConditionTrendView data={trend} />
      </div>
    </div>
  )
}
