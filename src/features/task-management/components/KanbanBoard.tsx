'use client'

import { useState } from 'react'
import { TASK_STATUSES, type Task } from '../types'
import { TaskCard } from './TaskCard'
import { TaskDetailModal } from './TaskDetailModal'
import type { EmployeeOption } from '../employee-filter'

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
  /** 閲覧者が自分の工数を記録できるか（責任者/マネージャー/メンバーのいずれか） */
  canLogWork: boolean
  /** 従業員ID→氏名のマップ（TaskCard/TaskDetailModalの担当者名表示に使う） */
  employeeNameById: Record<string, string>
  /** 担当者候補（そのタスクグループのマネージャー・メンバー。TaskDetailModalの担当者追加に使う） */
  assignableEmployees: EmployeeOption[]
  adviceTargets: EmployeeOption[]
}

/**
 * 最終レビュー Finding I4: モーダルの開閉状態（どのタスクが開いているか）を
 * KanbanBoard 側で一元管理する。タスクのステータスが変わると、そのタスクは
 * 別のステータス列（別の親 <div>）に移動するため、状態を TaskCard 自身が
 * 持っていると TaskCard がアンマウント/再マウントされてモーダルが理由不明に
 * 閉じてしまっていた（コメントスレッド閲覧中の状態が失われる）。
 * KanbanBoard はどのタスクがどのステータス列に属するかに関わらず存在し続ける
 * ため、ここに状態を置けばステータス変更後も生存する。
 */
export function KanbanBoard({
  tasks,
  myEmployeeId,
  canOperateAllTasks,
  canLogWork,
  employeeNameById,
  assignableEmployees,
  adviceTargets,
}: KanbanBoardProps) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const openTask = openTaskId ? (tasks.find(t => t.id === openTaskId) ?? null) : null
  const canOperateOpenTask = openTask
    ? canOperateAllTasks ||
      (myEmployeeId !== null && openTask.assigneeEmployeeIds.includes(myEmployeeId))
    : false

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
                  employeeNameById={employeeNameById}
                  onOpen={() => setOpenTaskId(task.id)}
                />
              ))}
          </div>
        </div>
      ))}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          isOpen={true}
          onClose={() => setOpenTaskId(null)}
          canOperate={canOperateOpenTask}
          currentEmployeeId={myEmployeeId}
          canModerateComments={canOperateAllTasks}
          canLogWork={canLogWork}
          canManageAssignees={canOperateAllTasks}
          assignableEmployees={assignableEmployees}
          adviceTargets={adviceTargets}
          employeeNameById={employeeNameById}
        />
      )}
    </div>
  )
}
