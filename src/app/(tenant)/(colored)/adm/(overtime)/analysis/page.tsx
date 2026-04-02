import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { parseYearMonthQuery } from '@/lib/year-month-query'
import { AnalysisDashboardClient } from './components/AnalysisDashboardClient'

export default async function WorkAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ year_month?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const sp = await searchParams
  const initialYearMonth = parseYearMonthQuery(sp.year_month)

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="grid h-10 grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200" />
              <div className="h-8 w-36 animate-pulse rounded-md bg-slate-200" />
              <div className="h-8 w-28 justify-self-end animate-pulse rounded-md bg-slate-200" />
            </div>
            <div className="h-64 animate-pulse rounded-lg bg-slate-200" />
          </div>
        }
      >
        <AnalysisDashboardClient initialYearMonth={initialYearMonth} />
      </Suspense>
    </div>
  )
}
