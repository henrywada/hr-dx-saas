import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getConsultationThread } from '@/features/consultation/queries'
import { ConsultationThreadView } from '@/features/consultation/components/ConsultationThreadView'

export default async function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const thread = await getConsultationThread(id, user.employee_id, false)
  if (!thread) redirect(APP_ROUTES.TENANT.CONSULTATION)

  return (
    <div className="px-4 sm:px-6 py-5 mx-auto w-full max-w-300">
      <ConsultationThreadView thread={thread} isStaff={false} />
    </div>
  )
}
