import type { TaskMilestone } from '../types'

interface MilestoneListProps {
  milestones: TaskMilestone[]
}

export function MilestoneList({ milestones }: MilestoneListProps) {
  if (milestones.length === 0) {
    return <p className="text-xs text-slate-500">マイルストーンがまだありません。</p>
  }

  return (
    <ul className="space-y-2">
      {milestones.map(milestone => (
        <li key={milestone.id} className="rounded-lg border border-slate-200 p-3">
          <p className="text-sm font-medium text-slate-900">{milestone.title}</p>
          {milestone.dueDate && <p className="text-xs text-slate-400">期限: {milestone.dueDate}</p>}
        </li>
      ))}
    </ul>
  )
}
