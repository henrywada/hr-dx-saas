import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { isSaasAdmin, isDeveloper } from '@/features/login-logs/saas-auth'
import { parseYearMonth, parseTenantId } from '@/features/login-logs/params'
import { getAllTenantLoginLogs, getLoginLogTenantOptions } from '@/features/login-logs/queries'
import { SaasLoginLogsView } from '@/features/login-logs/components/SaasLoginLogsView'

export const metadata = {
  title: 'ログイン履歴（全テナント） | HR-DX',
}

export default async function SaasLoginLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; tenant?: string }>
}) {
  // layout と二重の権限チェック
  if (!(await isSaasAdmin())) {
    redirect(APP_ROUTES.TENANT.PORTAL)
  }

  const sp = await searchParams
  const yearMonth = parseYearMonth(sp.ym)
  const tenantId = parseTenantId(sp.tenant)

  const [logs, tenantOptions, canPurge] = await Promise.all([
    getAllTenantLoginLogs(yearMonth, tenantId),
    getLoginLogTenantOptions(),
    isDeveloper(),
  ])

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <SaasLoginLogsView
        logs={logs}
        yearMonth={yearMonth}
        tenantId={tenantId}
        tenantOptions={tenantOptions}
        canPurge={canPurge}
      />
    </div>
  )
}
