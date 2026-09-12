'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { updateTaskStatus } from '../actions'
import { canOperateTask, resolveDropStatus } from '../kanban'
import { TASK_STATUSES, type Task } from '../types'
import { KanbanColumn } from './KanbanColumn'
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
  const router = useRouter()
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [dragError, setDragError] = useState<string | null>(null)
  const openTask = openTaskId ? (tasks.find(t => t.id === openTaskId) ?? null) : null
  const canOperateOpenTask = openTask
    ? canOperateTask(openTask, myEmployeeId, canOperateAllTasks)
    : false

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const newStatus = resolveDropStatus(event.over?.id)
    const task = tasks.find(t => t.id === activeId)
    if (!task || !newStatus || task.status === newStatus) return

    setDragError(null)
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: activeId, status: newStatus })
        router.refresh()
      } catch (err) {
        setDragError(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
      }
    })
  }

  return (
    <div className="space-y-2">
      {dragError && <p className="text-xs text-red-600">{dragError}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {TASK_STATUSES.map(status => (
            <KanbanColumn key={status} status={status} label={STATUS_LABEL[status]}>
              {tasks
                .filter(task => task.status === status)
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    employeeNameById={employeeNameById}
                    onOpen={() => setOpenTaskId(task.id)}
                    canDrag={!isPending && canOperateTask(task, myEmployeeId, canOperateAllTasks)}
                  />
                ))}
            </KanbanColumn>
          ))}
        </div>
      </DndContext>
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
