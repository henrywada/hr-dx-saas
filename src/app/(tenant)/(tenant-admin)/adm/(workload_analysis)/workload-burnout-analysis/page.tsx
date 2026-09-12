import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import { isTenantAdmin } from '@/features/task-management/permissions'
import { getTenantDivisions } from '@/features/task-management/queries'
import { getWorkloadOvertimeCrossData } from '@/features/workload-analysis/queries'
import { WorkloadOvertimeDashboard } from '@/features/workload-analysis/components/admin/WorkloadOvertimeDashboard'

export const metadata = { title: '工数×残業クロス分析' }

interface WorkloadBurnoutAnalysisPageProps {
  searchParams: Promise<{ division?: string }>
}

export default async function WorkloadBurnoutAnalysisPage({
  searchParams,
}: WorkloadBurnoutAnalysisPageProps) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  // 管理者以外は共通レイアウト（(tenant-admin)/layout.tsx）と同じ /top へ戻す。
  // 管理者専用ルート（/adm）へ飛ばすと、そこで再度リダイレクトされ二重遷移になる。
  if (!isTenantAdmin(user.appRole)) redirect(APP_ROUTES.TENANT.PORTAL)

  const { division } = await searchParams
  const divisionId = division && division.length > 0 ? division : undefined

  const supabase = await createClient()

  const [results, divisions] = await Promise.all([
    getWorkloadOvertimeCrossData(supabase, { divisionId }),
    getTenantDivisions(supabase),
  ])

  return (
    <WorkloadOvertimeDashboard
      results={results}
      divisions={divisions}
      selectedDivisionId={divisionId ?? null}
    />
  )
}
