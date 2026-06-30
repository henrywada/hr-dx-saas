import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import {
  getOneOnOneDashboardData,
  getActiveEmployeesForOneOnOne,
  getUpcomingOneOnOnesForManager,
} from '@/features/one-on-one/queries'
import { seedDefaultThemeTemplates } from '@/features/one-on-one/actions'
import { OneOnOneDashboard } from '@/features/one-on-one/components/OneOnOneDashboard'
import { canConductOneOnOne } from '@/features/one-on-one/types'
import { getRecentCareerDiscussionsForEmployees } from '@/features/career-discussions/queries'

export const metadata = { title: '1on1支援機能' }

export default async function OneOnOnePage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  // 管理職（is_manager）またはテナント管理者ロールのみアクセス可（actions.ts と同一判定）
  if (!canConductOneOnOne(user.appRole, user.is_manager)) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  // テーマテンプレートが空の場合にデフォルトをシード（冪等）
  await seedDefaultThemeTemplates()

  const [employeeList, data, upcoming] = await Promise.all([
    getActiveEmployeesForOneOnOne(),
    getOneOnOneDashboardData(),
    getUpcomingOneOnOnesForManager(),
  ])

  const careerDiscussionsByEmployee = await getRecentCareerDiscussionsForEmployees(
    employeeList.map(e => e.id)
  )

  return (
    <OneOnOneDashboard
      data={data}
      employees={employeeList}
      careerDiscussionsByEmployee={careerDiscussionsByEmployee}
      upcoming={upcoming}
    />
  )
}
