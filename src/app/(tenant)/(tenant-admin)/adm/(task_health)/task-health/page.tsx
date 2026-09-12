import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { APP_ROUTES } from '@/config/routes'
import { isTenantAdmin } from '@/features/task-management/permissions'
import {
  getTaskHealthOverview,
  getStalledTasks,
  getWorkloadDistribution,
  getObjectiveAchievementStatus,
  getTenantDivisions,
} from '@/features/task-management/queries'
import { TaskHealthDashboard } from '@/features/task-management/components/admin/TaskHealthDashboard'

export const metadata = { title: 'タスク健康度' }

interface TaskHealthPageProps {
  searchParams: Promise<{ division?: string }>
}

export default async function TaskHealthPage({ searchParams }: TaskHealthPageProps) {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)
  if (!isTenantAdmin(user.appRole)) redirect(APP_ROUTES.TENANT.ADMIN)

  const { division } = await searchParams
  const divisionId = division && division.length > 0 ? division : undefined

  const supabase = await createClient()

  const [overview, stalledTasks, workload, objectiveAchievements, divisions] = await Promise.all([
    getTaskHealthOverview(supabase, { divisionId }),
    getStalledTasks(supabase, { divisionId }),
    getWorkloadDistribution(supabase, { divisionId }),
    getObjectiveAchievementStatus(supabase, { divisionId }),
    getTenantDivisions(supabase),
  ])

  return (
    <TaskHealthDashboard
      overview={overview}
      stalledTasks={stalledTasks}
      workload={workload}
      objectiveAchievements={objectiveAchievements}
      divisions={divisions}
      selectedDivisionId={divisionId ?? null}
    />
  )
}
