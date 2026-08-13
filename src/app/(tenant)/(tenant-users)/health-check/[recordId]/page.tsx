import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { ResultDetailView } from '@/features/health-check/components/ResultDetailView'
import { getEmployeeResultHistory, getEmployeeResultView } from '@/features/health-check/queries'
import { InterviewBookingService } from '@/features/adm/high-stress-followup/components/InterviewBookingService'

export const metadata = { title: '健康診断結果詳細' }

export default async function HealthCheckDetailPage({
  params,
}: {
  params: Promise<{ recordId: string }>
}) {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.TENANT.PORTAL)
  const { recordId } = await params

  const [view, history] = await Promise.all([
    getEmployeeResultView(recordId, user.employee_id),
    getEmployeeResultHistory(user.employee_id, recordId),
  ])
  if (!view) notFound()

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-[1200px] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">健康診断結果</h1>
        <TenantBackLink />
      </div>
      {view.record.nurse_interview_recommended && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <InterviewBookingService staffRole="company_nurse" />
        </div>
      )}
      {view.record.doctor_interview_recommended && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <InterviewBookingService staffRole="company_doctor" />
        </div>
      )}
      <ResultDetailView view={view} history={history} />
    </div>
  )
}
