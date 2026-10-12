import { TaskGroupForm } from './TaskGroupForm'
import { ProgressBar } from './ProgressBar'
import type { TaskMilestone, TaskGroup } from '../types'

interface MilestoneListProps {
  milestones: TaskMilestone[]
  taskGroupsByMilestoneId: Record<string, TaskGroup[]>
  /** マイルストーンID → そのマイルストーン配下全タスクの進捗率（0-100） */
  milestoneProgressById: Record<string, number>
  canCreateTaskGroup: boolean
}

export function MilestoneList({
  milestones,
  taskGroupsByMilestoneId,
  milestoneProgressById,
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
          <div className="mt-2">
            <ProgressBar progress={milestoneProgressById[milestone.id] ?? 0} />
          </div>
          <ul className="mt-2 space-y-1">
            {(taskGroupsByMilestoneId[milestone.id] ?? []).map(group => (
              <li key={group.id} className="text-xs text-slate-700">
                {group.name}
              </li>
            ))}
          </ul>
          {canCreateTaskGroup && <TaskGroupForm milestoneId={milestone.id} />}
        </li>
      ))}
    </ul>
  )
}
