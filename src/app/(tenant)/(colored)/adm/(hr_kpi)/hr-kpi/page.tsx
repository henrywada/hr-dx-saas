import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getJSTYearMonth } from '@/lib/datetime'
import { getHrKpiBundle } from '@/features/hr-kpi/queries'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { HrKpiDashboard } from '@/features/hr-kpi/components/HrKpiDashboard'

export const metadata = { title: '横断KPIダッシュボード' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function HrKpiPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const sp = await searchParams
  const raw = Array.isArray(sp.ym) ? sp.ym[0] : sp.ym
  const yearMonth = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : getJSTYearMonth()

  const result = await getHrKpiBundle(yearMonth)

  if (!result.ok) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertTitle>データを読み込めませんでした</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <HrKpiDashboard bundle={result.data} />
}
