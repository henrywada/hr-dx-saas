import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getEngagementDashboardData } from '@/features/engagement/queries'
import { EngagementDashboard } from '@/features/engagement/components/EngagementDashboard'

export const metadata = { title: '統合エンゲージメントダッシュボード' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function EngagementPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const data = await getEngagementDashboardData()

  return <EngagementDashboard data={data} />
}
