import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { getMyHealthCheckRecords } from '@/features/health-check/queries'
import { EMPLOYMENT_JUDGMENT_LABEL } from '@/features/health-check/types'
import { InterviewBookingService } from '@/features/adm/high-stress-followup/components/InterviewBookingService'

export const metadata = { title: '健康診断結果' }

export default async function HealthCheckPage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.TENANT.PORTAL)

  const records = await getMyHealthCheckRecords()
  const latest = records[0]

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-[1200px] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">健康診断結果</h1>
        <TenantBackLink />
      </div>

      {latest?.nurse_interview_recommended && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <InterviewBookingService staffRole="company_nurse" />
        </div>
      )}
      {latest?.doctor_interview_recommended && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <InterviewBookingService staffRole="company_doctor" />
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
        {records.length === 0 ? (
          <p className="text-xs text-slate-400">結果はまだありません</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {records.map(r => (
              <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-medium text-slate-800">{r.exam_date}</p>
                  <p className="text-slate-500">
                    就業判定 {EMPLOYMENT_JUDGMENT_LABEL[r.employment_judgment]}
                    {r.nurse_interview_recommended ? ' / 保健師面談推奨' : ''}
                    {r.doctor_interview_recommended ? ' / 産業医面談推奨' : ''}
                  </p>
                </div>
                <Link
                  href={APP_ROUTES.TENANT.HEALTH_CHECK_DETAIL(r.id)}
                  className="text-xs font-semibold text-(--brand) hover:underline"
                >
                  詳細
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
