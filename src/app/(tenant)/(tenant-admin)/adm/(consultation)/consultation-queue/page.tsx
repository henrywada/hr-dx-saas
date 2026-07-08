import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import {
  getConsultationQueue,
  getAnonymousConsultationAggregates,
} from '@/features/consultation/queries'
import { ConsultationQueueTable } from '@/features/consultation/components/ConsultationQueueTable'
import { ConsultationAnalyticsPanel } from '@/features/consultation/components/ConsultationAnalyticsPanel'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export default async function ConsultationQueuePage() {
  const user = await getServerUser()
  if (!user || !STAFF_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [items, aggregates] = await Promise.all([
    getConsultationQueue(),
    getAnonymousConsultationAggregates(),
  ])

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-300 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold">相談窓口キュー管理</h1>
        <TenantBackLink className="self-start shrink-0" />
      </div>
      <ConsultationAnalyticsPanel rows={aggregates} />
      <ConsultationQueueTable items={items} />
    </div>
  )
}
