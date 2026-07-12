import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getConsultationQueue } from '@/features/consultation/queries'
import { ConsultationQueueTable } from '@/features/consultation/components/ConsultationQueueTable'
import TenantBackLink from '@/components/common/TenantBackLink'

export const metadata = { title: '対応が必要な相談' }

export default async function ConsultationInboxPage() {
  const user = await getServerUser()
  // is_manager=true の従業員のみ対象（「上司」指名・「誰でもいい」のマネージャー枠の責任者）。
  // hr/hr_manager/hsc は /adm/consultation-queue で同等の機能を既に持つため、ここでは対象外。
  if (!user?.employee_id || !user.is_manager) {
    redirect(APP_ROUTES.TENANT.CONSULTATION)
  }

  const items = await getConsultationQueue()

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto w-full max-w-300">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h1 className="text-sm font-semibold">対応が必要な相談</h1>
        <TenantBackLink />
      </div>
      <ConsultationQueueTable
        items={items}
        detailBasePath={APP_ROUTES.TENANT.CONSULTATION_INBOX_DETAIL('')}
      />
    </div>
  )
}
