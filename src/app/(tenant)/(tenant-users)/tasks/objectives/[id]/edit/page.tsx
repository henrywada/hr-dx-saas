import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { getObjectiveSimpleView, getManagerEmployees } from '@/features/task-management/queries'
import { ObjectiveWorkspace } from '@/features/task-management/components/ObjectiveWorkspace'
import { isObjectiveOwner, isTaskResponsible } from '@/features/task-management/permissions'
import { APP_ROUTES } from '@/config/routes'
import type { CreatedTask } from '@/features/task-management/components/SimpleTaskForm'

export default async function EditObjectivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getServerUser()
  if (!user?.employee_id) {
    redirect(APP_ROUTES.tasks.root)
  }

  const supabase = await createClient()

  let view
  try {
    view = await getObjectiveSimpleView(supabase, id)
  } catch {
    notFound()
  }

  const { objective, defaultTaskGroupId, tasks } = view
  const isOwner = isObjectiveOwner(objective.ownerEmployeeId, user.employee_id)
  const isResponsible = tasks.some(
    t =>
      t.responsibleEmployeeId != null &&
      isTaskResponsible(t.responsibleEmployeeId, user.employee_id!)
  )

  // 目標責任者 or タスク責任者のみ編集ワークスペースを開ける
  if (!isOwner && !isResponsible) {
    redirect(APP_ROUTES.tasks.root)
  }

  const managers = await getManagerEmployees(supabase)
  const initialTasks: CreatedTask[] = tasks
    .filter(t => t.responsibleEmployeeId != null)
    .map(t => ({
      id: t.id,
      title: t.title,
      goalSummary: t.goalSummary,
      dueDate: t.dueDate,
      priority: t.priority,
      responsibleEmployeeId: t.responsibleEmployeeId as string,
    }))

  return (
    <div className="w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <ObjectiveWorkspace
        heading="目標の編集"
        objective={{
          id: objective.id,
          taskGroupId: defaultTaskGroupId,
          title: objective.title,
          description: objective.description ?? '',
          dueDate: objective.dueDate ?? '',
        }}
        managers={managers}
        initialTasks={initialTasks}
      />
    </div>
  )
}
