import Link from 'next/link'
import { Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getMyObjectivesWithProgress,
  getObjectiveIdsWhereResponsible,
  getTenantEmployees,
} from '@/features/task-management/queries'
import { ObjectiveCard } from '@/features/task-management/components/ObjectiveCard'
import { isObjectiveOwner } from '@/features/task-management/permissions'
import { APP_ROUTES } from '@/config/routes'

export default async function TasksPage() {
  const user = await getServerUser()
  const supabase = await createClient()
  const objectivesWithProgress = await getMyObjectivesWithProgress(supabase)
  const employees = await getTenantEmployees(supabase)
  const employeeNameById = Object.fromEntries(employees.map(e => [e.id, e.name]))

  const objectiveIds = objectivesWithProgress.map(({ objective }) => objective.id)
  const responsibleObjectiveIds =
    user?.employee_id != null
      ? await getObjectiveIdsWhereResponsible(supabase, user.employee_id, objectiveIds)
      : new Set<string>()

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Target className="h-5 w-5 text-[#FD7601]" strokeWidth={2} />
          目標管理
        </h1>
        {user?.is_manager && (
          <Link
            href={APP_ROUTES.tasks.objectiveNew}
            className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white"
          >
            新しい目標を作成
          </Link>
        )}
      </div>
      {objectivesWithProgress.length === 0 ? (
        <p className="text-xs text-slate-500">関与している目標がまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {objectivesWithProgress.map(({ objective, progress }) => {
            const isOwner =
              user?.employee_id != null &&
              isObjectiveOwner(objective.ownerEmployeeId, user.employee_id)
            const isResponsible = responsibleObjectiveIds.has(objective.id)
            // 目標責任者 or タスク責任者のとき編集・削除ボタンを表示
            const canManage = isOwner || isResponsible
            return (
              <ObjectiveCard
                key={objective.id}
                objective={objective}
                progress={progress}
                employeeNameById={employeeNameById}
                canManage={canManage}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
