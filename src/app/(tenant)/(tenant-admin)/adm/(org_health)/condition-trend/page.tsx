import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getDivisions } from '@/features/organization/queries'
import { getDivisionConditionTrend } from '@/features/condition-checkin/queries'
import { DivisionConditionTrendView } from '@/features/condition-checkin/components/DivisionConditionTrendView'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export const metadata = { title: '部署別コンディション傾向' }

export default async function ConditionTrendPage({
  searchParams,
}: {
  searchParams: Promise<{ divisionId?: string }>
}) {
  const user = await getServerUser()
  if (!user || !STAFF_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const { divisionId } = await searchParams
  const divisions = await getDivisions()
  const divisionOptions = divisions.map(d => ({ id: d.id, name: d.name }))
  const selectedDivisionId = divisionId ?? divisionOptions[0]?.id

  const trend = selectedDivisionId ? await getDivisionConditionTrend(selectedDivisionId) : []

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-[1200px] space-y-4">
      <h1 className="text-sm font-semibold text-slate-900">部署別コンディション傾向</h1>
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        {divisionOptions.length === 0 ? (
          <p className="text-sm text-slate-400">部署が登録されていません</p>
        ) : (
          <DivisionConditionTrendView
            data={trend}
            divisionOptions={divisionOptions}
            selectedDivisionId={selectedDivisionId}
          />
        )}
      </div>
    </div>
  )
}
