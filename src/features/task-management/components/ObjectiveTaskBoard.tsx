'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SimpleTaskCard } from './SimpleTaskCard'
import { TaskDetailModal } from './TaskDetailModal'
import { deleteTask } from '../actions'
import { isTaskResponsible, canEditTask } from '../permissions'
import type { Task } from '../types'
import type { EmployeeOption } from '../employee-filter'
import type { DivisionOption, TaskGroupParticipants } from '../queries'

interface ObjectiveTaskBoardProps {
  objectiveId: string
  taskGroupId: string
  tasks: Task[]
  employees: EmployeeOption[]
  employeeNameById: Record<string, string>
  /** 組織階層絞り込み担当者選択（DivisionFilteredEmployeePicker）用の組織一覧 */
  divisions: DivisionOption[]
  /** 組織階層絞り込み担当者選択用の従業員ID→所属division_idマップ */
  employeeDivisionById: Record<string, string | null>
  currentEmployeeId: string | null
  isObjectiveOwner: boolean
  /** 目標責任者・タスクグループのマネージャー・メンバー一覧（コメントの宛先候補算出用） */
  participants: TaskGroupParticipants
}

/** タスクカードのグリッド表示 + カードクリックで開く詳細モーダルの管理。 */
export function ObjectiveTaskBoard({
  tasks,
  employees,
  employeeNameById,
  divisions,
  employeeDivisionById,
  currentEmployeeId,
  isObjectiveOwner: isOwner,
  participants,
}: ObjectiveTaskBoardProps) {
  const router = useRouter()
  const [openTaskId, setOpenTaskId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(taskId: string) {
    if (!window.confirm('このタスクを削除しますか？')) return
    startTransition(async () => {
      await deleteTask({ taskId })
      router.refresh()
    })
  }

  const openTask = tasks.find(t => t.id === openTaskId) ?? null

  const isResponsibleOfOpenTask =
    currentEmployeeId && openTask
      ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId)
      : false
  const isMemberOfOpenTask =
    currentEmployeeId && openTask ? openTask.memberEmployeeIds.includes(currentEmployeeId) : false

  // advice: オーナー→責任者、責任者→メンバー
  const adviceTargets = isOwner
    ? participants.managers
    : isResponsibleOfOpenTask
      ? participants.members
      : []
  // suggestion: メンバー→責任者、責任者→オーナー
  const suggestionTargets = isMemberOfOpenTask
    ? participants.managers
    : isResponsibleOfOpenTask && participants.objectiveOwner
      ? [participants.objectiveOwner]
      : []
  // report: 責任者→オーナーのみ
  const reportTargets =
    isResponsibleOfOpenTask && participants.objectiveOwner ? [participants.objectiveOwner] : []

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">タスク一覧</h2>
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500">タスクがまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(task => {
            const isResponsible = currentEmployeeId
              ? isTaskResponsible(task.responsibleEmployeeId, currentEmployeeId)
              : false
            const canEdit = canEditTask(isOwner, isResponsible)
            return (
              <div
                key={task.id}
                onClick={e => {
                  // 削除・編集ボタン（SimpleTaskCard内）のクリックはカードの詳細モーダルを開かない。
                  // ボタンのクリックハンドラ内で非同期処理（削除・確認ダイアログ等）が走っている最中に
                  // イベントがバブリングして親divのonClickも発火すると、削除処理中のタスクに対して
                  // 詳細モーダルが操作可能な状態で開いてしまう不整合が起きるため。
                  if ((e.target as HTMLElement).closest('button')) return
                  setOpenTaskId(task.id)
                }}
                className="cursor-pointer"
              >
                <SimpleTaskCard
                  task={task}
                  employeeNameById={employeeNameById}
                  canEdit={canEdit}
                  onEdit={() => setOpenTaskId(task.id)}
                  onDelete={() => handleDelete(task.id)}
                />
              </div>
            )
          })}
        </div>
      )}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          isOpen={true}
          onClose={() => setOpenTaskId(null)}
          canOperate={
            currentEmployeeId
              ? isOwner ||
                isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId) ||
                openTask.memberEmployeeIds.includes(currentEmployeeId)
              : false
          }
          currentEmployeeId={currentEmployeeId}
          canModerateComments={isOwner}
          canLogWork={
            currentEmployeeId
              ? isOwner ||
                isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId) ||
                openTask.memberEmployeeIds.includes(currentEmployeeId)
              : false
          }
          canManageAssignees={
            isOwner ||
            (currentEmployeeId
              ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId)
              : false)
          }
          assignableEmployees={employees}
          adviceTargets={adviceTargets}
          suggestionTargets={suggestionTargets}
          reportTargets={reportTargets}
          employeeNameById={employeeNameById}
          divisions={divisions}
          employeeDivisionById={employeeDivisionById}
          canEditBasicInfo={canEditTask(
            isOwner,
            currentEmployeeId
              ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId)
              : false
          )}
        />
      )}
      {isPending && <p className="text-xs text-slate-400">処理中...</p>}
    </section>
  )
}
