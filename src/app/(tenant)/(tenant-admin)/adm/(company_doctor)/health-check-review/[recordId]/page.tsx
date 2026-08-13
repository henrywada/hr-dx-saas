import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { ResultDetailView } from '@/features/health-check/components/ResultDetailView'
import { DoctorReviewForm } from '@/features/health-check/components/DoctorReviewForm'
import {
  getDoctorQueue,
  getEmployeeResultHistory,
  getEmployeeResultView,
} from '@/features/health-check/queries'
import { MEDICAL_ROLES } from '@/features/health-check/types'

export const metadata = { title: '健康診断結果 就業判定' }

export default async function HealthCheckReviewDetailPage({
  params,
}: {
  params: Promise<{ recordId: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id || !MEDICAL_ROLES.includes(user.appRole as (typeof MEDICAL_ROLES)[number])) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }
  const { recordId } = await params
  const view = await getEmployeeResultView(recordId)
  if (!view) notFound()

  const [queue, history] = await Promise.all([
    getDoctorQueue(view.record.campaign_id),
    getEmployeeResultHistory(view.record.employee_id, recordId),
  ])
  const row = queue.find(q => q.id === recordId)

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-[1400px] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">健康診断結果参照</h1>
        <TenantBackLink />
      </div>
      <ResultDetailView
        view={view}
        history={history}
        showName={row?.employee_name ?? null}
        sideContent={<DoctorReviewForm view={view} role={user.appRole ?? ''} />}
      />
    </div>
  )
}
