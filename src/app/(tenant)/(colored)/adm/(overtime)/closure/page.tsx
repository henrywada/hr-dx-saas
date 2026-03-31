import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { canAccessHrAttendanceDashboard } from '@/features/attendance/hr-dashboard-access'
import { APP_ROUTES } from '@/config/routes'
import { ClosureListClient } from './components/ClosureListClient'

export default async function ClosureManagementPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }
  if (!canAccessHrAttendanceDashboard(user)) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <ClosureListClient />
    </div>
  )
}
