import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { TaskGroupForm } from './TaskGroupForm'
import type { TaskMilestone, TaskGroup } from '../types'

interface MilestoneListProps {
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
  canCreateTaskGroup: boolean
}

export function MilestoneList({
  milestones,
  taskGroupsByMilestoneId,
  canCreateTaskGroup,
}: MilestoneListProps) {
  if (milestones.length === 0) {
    return <p className="text-xs text-slate-500">マイルストーンがまだありません。</p>
  }

  return (
    <ul className="space-y-3">
      {milestones.map(milestone => (
        <li key={milestone.id} className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">{milestone.title}</p>
          {milestone.dueDate && <p className="text-xs text-slate-400">期限: {milestone.dueDate}</p>}
          <ul className="mt-2 space-y-1">
            {(taskGroupsByMilestoneId[milestone.id] ?? []).map(group => (
              <li key={group.id}>
                <Link
                  href={APP_ROUTES.tasks.groupDetail(group.id)}
                  className="text-xs text-[#FD7601] underline"
                >
                  {group.name}
                </Link>
              </li>
            ))}
          </ul>
          {canCreateTaskGroup && <TaskGroupForm milestoneId={milestone.id} />}
        </li>
      ))}
    </ul>
  )
}
