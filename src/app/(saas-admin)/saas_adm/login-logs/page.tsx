import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { isSaasAdmin, isDeveloper } from '@/features/login-logs/saas-auth'
import { parseYearMonth, parseTenantId, parseLogView } from '@/features/login-logs/params'
import {
  getAllTenantAccessLogs,
  getAllTenantLoginSessions,
  getServiceRoutes,
  getLoginLogTenantOptions,
} from '@/features/login-logs/queries'
import { SaasLoginLogsView } from '@/features/login-logs/components/SaasLoginLogsView'

export const metadata = {
  title: 'ログイン履歴（全テナント） | HR-DX',
}

export default async function SaasLoginLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; tenant?: string; view?: string }>
}) {
  // layout と二重の権限チェック
  if (!(await isSaasAdmin())) {
    redirect(APP_ROUTES.TENANT.PORTAL)
  }

  const sp = await searchParams
  const yearMonth = parseYearMonth(sp.ym)
  const tenantId = parseTenantId(sp.tenant)
  const view = parseLogView(sp.view)

  // 表示中の種別だけ取得する（ページ閲覧は件数が多いため）
  const [sessions, accessLogs, serviceRoutes, tenantOptions, canPurge] = await Promise.all([
    view === 'sessions' ? getAllTenantLoginSessions(yearMonth, tenantId) : Promise.resolve([]),
    view === 'pages' ? getAllTenantAccessLogs(yearMonth, tenantId) : Promise.resolve([]),
    view === 'pages' ? getServiceRoutes() : Promise.resolve([]),
    getLoginLogTenantOptions(),
    isDeveloper(),
  ])

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <SaasLoginLogsView
        view={view}
        sessions={sessions}
        accessLogs={accessLogs}
        serviceRoutes={serviceRoutes}
        yearMonth={yearMonth}
        tenantId={tenantId}
        tenantOptions={tenantOptions}
        canPurge={canPurge}
      />
    </div>
  )
}
