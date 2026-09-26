import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { getLoginSessions } from '@/features/login-logs/queries'
import { LoginLogsView } from '@/features/login-logs/components/LoginLogsView'

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function parseYearMonth(raw: unknown): string | null {
  return typeof raw === 'string' && YEAR_MONTH_RE.test(raw) ? raw : null
}

export default async function LoginLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const sp = await searchParams
  const yearMonth = parseYearMonth(sp.ym)

  const sessions = await getLoginSessions(yearMonth)

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <LoginLogsView sessions={sessions} yearMonth={yearMonth} />
    </div>
  )
}
