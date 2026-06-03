import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getJSTYearMonth } from '@/lib/datetime'
import { getLaborComplianceBundle } from '@/features/labor-compliance/queries'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import LaborComplianceDashboard from './components/LaborComplianceDashboard'

export const metadata = { title: '労務コンプライアンスダッシュボード' }

export default async function LaborCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  // hr / hr_manager / tenant_admin / developer のみアクセス可
  const allowedRoles = ['hr', 'hr_manager', 'tenant_admin', 'developer']
  if (!allowedRoles.includes(user.appRole ?? '')) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const sp = await searchParams
  const raw = Array.isArray(sp.ym) ? sp.ym[0] : sp.ym
  const yearMonth = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : getJSTYearMonth()

  const result = await getLaborComplianceBundle(yearMonth)

  if ('error' in result) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <Alert variant="destructive">
          <AlertTitle>データを読み込めませんでした</AlertTitle>
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <LaborComplianceDashboard bundle={result.data} />
}
