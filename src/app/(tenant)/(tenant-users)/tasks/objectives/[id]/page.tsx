import { Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import {
  getObjectiveSimpleView,
  getTenantEmployees,
  getTenantDivisions,
  getEmployeeDivisionMap,
  getTaskGroupParticipants,
} from '@/features/task-management/queries'
import { TaskStatusDonutChart } from '@/features/task-management/components/TaskStatusDonutChart'
import { ObjectiveTaskBoard } from '@/features/task-management/components/ObjectiveTaskBoard'
import { isObjectiveOwner } from '@/features/task-management/permissions'

export default async function ObjectiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  const supabase = await createClient()
  const { objective, defaultTaskGroupId, tasks } = await getObjectiveSimpleView(supabase, id)
  const employees = await getTenantEmployees(supabase)
  const employeeNameById = Object.fromEntries(employees.map(e => [e.id, e.name]))
  const divisions = await getTenantDivisions(supabase)
  const employeeDivisionById = await getEmployeeDivisionMap(supabase)
  const participants = await getTaskGroupParticipants(supabase, defaultTaskGroupId, employees)
  const isOwner = user?.employee_id
    ? isObjectiveOwner(objective.ownerEmployeeId, user.employee_id)
    : false

  return (
    <div className="space-y-4 w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Target className="h-5 w-5 text-[#FD7601]" strokeWidth={2} />
          {objective.title}
        </h1>
        <p className="text-xs text-slate-500">
          作成者: {employeeNameById[objective.ownerEmployeeId] ?? objective.ownerEmployeeId}
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 p-3">
        <h2 className="mb-2 text-xs font-semibold text-slate-900">ステータス分布</h2>
        <TaskStatusDonutChart tasks={tasks} />
      </section>

      <ObjectiveTaskBoard
        objectiveId={objective.id}
        taskGroupId={defaultTaskGroupId}
        tasks={tasks}
        employees={employees}
        employeeNameById={employeeNameById}
        divisions={divisions}
        employeeDivisionById={employeeDivisionById}
        currentEmployeeId={user?.employee_id ?? null}
        isObjectiveOwner={isOwner}
        participants={participants}
      />
    </div>
  )
}
