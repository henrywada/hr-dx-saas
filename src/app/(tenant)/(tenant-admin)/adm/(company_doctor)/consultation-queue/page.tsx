import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getConsultationQueue } from '@/features/consultation/queries'
import { ConsultationQueueTable } from '@/features/consultation/components/ConsultationQueueTable'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export default async function ConsultationQueuePage() {
  const user = await getServerUser()
  if (!user || !STAFF_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const items = await getConsultationQueue()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-480">
      <h1 className="text-sm font-semibold mb-4">相談窓口キュー管理</h1>
      <ConsultationQueueTable items={items} />
    </div>
  )
}
