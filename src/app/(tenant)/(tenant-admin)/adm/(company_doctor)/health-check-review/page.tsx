import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { BulkDoctorJudgmentButton } from '@/features/health-check/components/BulkDoctorJudgmentButton'
import { DoctorQueueSection } from '@/features/health-check/components/DoctorQueueSection'
import { getCampaigns, getDoctorQueue } from '@/features/health-check/queries'
import { MEDICAL_ROLES } from '@/features/health-check/types'

export const metadata = { title: '健康診断結果参照' }

export default async function HealthCheckReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id || !MEDICAL_ROLES.includes(user.appRole as (typeof MEDICAL_ROLES)[number])) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const { campaignId } = await searchParams
  const campaigns = await getCampaigns()
  const selected = campaigns.find(c => c.id === campaignId) ?? campaigns[0] ?? null
  const rows = await getDoctorQueue(selected?.id)
  const pending = rows.filter(r => !r.doctor_judgment_code)
  const judged = rows.filter(r => Boolean(r.doctor_judgment_code))
  const candidates = pending
    .filter(r => r.overall_standard_code)
    .map(r => ({
      employee_name: r.employee_name,
      overall_standard_code: r.overall_standard_code as string,
    }))

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">健康診断結果参照</h1>
        <TenantBackLink className="self-start shrink-0" />
      </div>
      {campaigns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {campaigns.map(c => (
            <Link
              key={c.id}
              href={`${APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_REVIEW}?campaignId=${c.id}`}
              className={`px-2.5 py-1.5 text-xs rounded-lg border ${
                selected?.id === c.id
                  ? 'border-orange-300 bg-orange-50 text-orange-800'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              {c.fiscal_year}年度 第{c.round}回
            </Link>
          ))}
        </div>
      )}
      <DoctorQueueSection
        pending={pending}
        judged={judged}
        bulkActionSlot={
          user.appRole === 'company_doctor' ? (
            <BulkDoctorJudgmentButton campaignId={selected?.id ?? null} candidates={candidates} />
          ) : null
        }
      />
    </div>
  )
}
