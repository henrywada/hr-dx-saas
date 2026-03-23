import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getGroupAnalysis,
  getGroupTrend,
} from '@/features/adm/stress-check/queries'
import GroupAnalysisContent from '@/features/adm/stress-check/components/GroupAnalysisContent'

export default async function GroupAnalysisPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [groups, trendData] = await Promise.all([
    getGroupAnalysis(user.tenant_id),
    getGroupTrend(user.tenant_id),
  ])

  return (
    <GroupAnalysisContent groups={groups} trendData={trendData} />
  )
}
