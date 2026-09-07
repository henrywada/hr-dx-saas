import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getTaskGroupBoard, getTenantEmployees } from '@/features/task-management/queries'
import { KanbanBoard } from '@/features/task-management/components/KanbanBoard'
import { TaskForm } from '@/features/task-management/components/TaskForm'
import { ManagerAssignForm } from '@/features/task-management/components/ManagerAssignForm'
import { MemberAssignForm } from '@/features/task-management/components/MemberAssignForm'
import { CommentThread } from '@/features/task-management/components/CommentThread'
import {
  isObjectiveOwner,
  isTaskGroupManager,
  canAssignManager,
  canAssignMember,
} from '@/features/task-management/permissions'

export default async function TaskGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  const supabase = await createClient()
  const board = await getTaskGroupBoard(supabase, id)

  // 表示制御のみの判定（UIの出し分け）。実際のアクセス制御は tasks 等の RLS ポリシーが担う。
  // user が null、または employee_id が未設定（従業員レコード無しユーザー）の場合は
  // 責任者・マネージャーいずれでもない扱いにする。
  const isOwner = user?.employee_id
    ? isObjectiveOwner(board.objectiveOwnerEmployeeId, user.employee_id)
    : false
  const isManager = user?.employee_id
    ? isTaskGroupManager(board.managerEmployeeIds, user.employee_id)
    : false
  const canManageMembers = canAssignMember(isOwner, isManager)
  const canOperateAllTasks = isOwner || isManager

  // 従業員選択フォーム（TaskForm/ManagerAssignForm/MemberAssignForm）はいずれも
  // 責任者・マネージャーにしか表示されないため、それ以外の一般メンバーには
  // テナント全従業員一覧の取得自体を行わない（無駄なクエリ・データ転送を避ける）。
  const needsEmployees = isOwner || isManager || canManageMembers
  const employees = needsEmployees ? await getTenantEmployees(supabase) : []
  const assignableEmployees = employees.filter(
    e => board.managerEmployeeIds.includes(e.id) || board.memberEmployeeIds.includes(e.id)
  )

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 lg:px-8 py-5 mx-auto max-w-[1920px]">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{board.group.name}</h1>
        <p className="text-xs text-slate-500">平均進捗: {board.averageProgress}%</p>
      </div>

      {(isOwner || isManager) && (
        <section className="space-y-2">
          <TaskForm taskGroupId={board.group.id} assignableEmployees={assignableEmployees} />
        </section>
      )}

      <KanbanBoard
        tasks={board.tasks}
        myEmployeeId={user?.employee_id ?? null}
        canOperateAllTasks={canOperateAllTasks}
      />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {canAssignManager(isOwner) && (
          <div className="rounded-lg border border-slate-200 p-3">
            <h2 className="text-xs font-semibold text-slate-900 mb-2">マネージャー割当</h2>
            <ManagerAssignForm taskGroupId={board.group.id} employees={employees} />
          </div>
        )}
        {canManageMembers && (
          <div className="rounded-lg border border-slate-200 p-3">
            <h2 className="text-xs font-semibold text-slate-900 mb-2">メンバー</h2>
            <MemberAssignForm
              taskGroupId={board.group.id}
              memberEmployeeIds={board.memberEmployeeIds}
              employees={employees}
            />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 p-3">
        <h2 className="text-xs font-semibold text-slate-900 mb-2">タスクグループへのコメント</h2>
        <CommentThread
          target={{ taskGroupId: board.group.id }}
          canPost={isOwner || isManager}
          currentEmployeeId={user?.employee_id ?? null}
          canModerate={isOwner || isManager}
        />
      </section>
    </div>
  )
}
