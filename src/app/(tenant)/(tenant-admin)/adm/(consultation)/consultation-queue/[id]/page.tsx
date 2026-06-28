import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getConsultationThread } from '@/features/consultation/queries'
import { ConsultationThreadView } from '@/features/consultation/components/ConsultationThreadView'

const STAFF_ROLES = ['hr', 'hr_manager', 'company_doctor', 'company_nurse', 'hsc']

export default async function ConsultationQueueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerUser()
  if (!user?.employee_id || !STAFF_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const thread = await getConsultationThread(id, user.employee_id, true)
  if (!thread) redirect(APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE)

  return (
    <div className="px-4 sm:px-6 py-6 mx-auto w-full max-w-300">
      <ConsultationThreadView thread={thread} isStaff />
    </div>
  )
}
