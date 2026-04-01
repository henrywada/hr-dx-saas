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
      <h1 className="text-2xl font-bold text-gray-900">勤務状況分析</h1>
      <Suspense
        fallback={
          <div className="space-y-8">
            <div className="h-10 max-w-xs animate-pulse rounded-md bg-slate-200" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-200" />
              ))}
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
