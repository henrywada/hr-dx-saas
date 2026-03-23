import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getServiceAssignmentsForAdmin } from '@/features/service-assignments/queries'
import { ServiceAssignmentTable } from '@/features/service-assignments/components/ServiceAssignmentTable'

export default async function ServiceAssignmentsPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const assignments = await getServiceAssignmentsForAdmin()

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ServiceAssignmentTable assignments={assignments} />
    </div>
  )
}
