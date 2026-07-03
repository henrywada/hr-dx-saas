import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getExecutiveSummary } from '@/features/executive-summary/queries'
import { ExecutiveSummaryDashboard } from '@/features/executive-summary/components/ExecutiveSummaryDashboard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export const metadata = { title: '経営者向け統合エグゼクティブサマリー' }

const ALLOWED_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

export default async function ExecutiveSummaryPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  if (!ALLOWED_ROLES.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const result = await getExecutiveSummary()

  if (result.ok === false) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>データを読み込めませんでした</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <ExecutiveSummaryDashboard summary={result.data} />
}
