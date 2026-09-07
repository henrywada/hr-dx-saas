import { TASK_STATUSES, type Task } from '../types'
import { TaskCard } from './TaskCard'

const STATUS_LABEL: Record<Task['status'], string> = {
  todo: '未着手',
  in_progress: '進行中',
  review: 'レビュー',
  done: '完了',
  blocked: '保留',
}

interface KanbanBoardProps {
  tasks: Task[]
  /** 閲覧者本人の従業員ID（従業員レコード無しユーザーは null） */
  myEmployeeId: string | null
  /** 閲覧者がこのタスクグループの責任者またはマネージャーか（全タスクを操作可能） */
  canOperateAllTasks: boolean
}

export function KanbanBoard({ tasks, myEmployeeId, canOperateAllTasks }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
      {TASK_STATUSES.map(status => (
        <div key={status} className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-700">{STATUS_LABEL[status]}</h3>
          <div className="space-y-2">
            {tasks
              .filter(task => task.status === status)
              .map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  myEmployeeId={myEmployeeId}
                  canOperateAllTasks={canOperateAllTasks}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
