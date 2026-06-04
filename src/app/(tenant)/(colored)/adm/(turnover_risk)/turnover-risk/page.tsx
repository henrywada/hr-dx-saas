import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getTurnoverRiskRows,
  getTurnoverRiskSummary,
} from '@/features/turnover-risk/queries'
import { TurnoverRiskDashboard } from '@/features/turnover-risk/components/TurnoverRiskDashboard'

export const metadata = { title: '離職予兆スコアリング' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function TurnoverRiskPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const [rows, summary] = await Promise.all([
    getTurnoverRiskRows(),
    getTurnoverRiskSummary(),
  ])

  return <TurnoverRiskDashboard rows={rows} summary={summary} />
}
