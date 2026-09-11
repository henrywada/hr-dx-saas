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

/**
 * 従業員ID配列を EmployeeOption に解決する（`employees` はテナント全体一覧なので必ず解決できる想定）。
 * 閲覧者自身のIDは除外する（最終レビュー Finding 4: 自分自身が算出対象の宛先候補に
 * 紛れ込むケース、例えばメンバーが同時に別タスクのマネージャーでもある場合の自己宛て化を防ぐ）。
 */
function resolveEmployeeOptions(
  ids: string[],
  employees: EmployeeOption[],
  currentEmployeeId: string | null
): EmployeeOption[] {
  const byId = new Map(employees.map(e => [e.id, e]))
  return ids
    .map(id => byId.get(id))
    .filter((e): e is EmployeeOption => Boolean(e) && e.id !== currentEmployeeId)
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
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(taskId: string) {
    if (!window.confirm('このタスクを削除しますか？')) return
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteTask({ taskId })
        router.refresh()
      } catch (err) {
        // 最終レビュー Finding 5: ここで例外を投げっぱなしにすると、startTransition内の
        // 未捕捉エラーが最も近いError Boundary（route の error.tsx）まで伝播し、
        // 目標詳細ページ全体がエラー画面に置き換わってしまう（RLSが権限なしで拒否した場合等）。
        // 他のコンポーネント（TaskDetailModal等）と同じ try/catch + setError パターンに揃える。
        setDeleteError(err instanceof Error ? err.message : 'タスクの削除に失敗しました')
      }
    })
  }

  const openTask = tasks.find(t => t.id === openTaskId) ?? null

  const isResponsibleOfOpenTask =
    currentEmployeeId && openTask
      ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId)
      : false
  const isMemberOfOpenTask =
    currentEmployeeId && openTask ? openTask.memberEmployeeIds.includes(currentEmployeeId) : false

  // 最終レビュー Finding 4: 宛先候補はタスクグループ全体（participants.managers/members、
  // 他タスクの責任者・メンバーも含む）ではなく、いま開いているタスク自身の
  // responsibleEmployeeId/memberEmployeeIds に絞る（design.md セクション4の
  // タスク単位の宛先ルーティングに合わせる）。RLSの can_send_advice/can_send_suggestion 等は
  // 引き続きタスクグループ全体を許可範囲とするため、ここでの絞り込みは表示上の
  // サブセット化に過ぎず、送信可否そのものを狭めることはない。
  // advice: オーナー→（そのタスクの）責任者、責任者→（そのタスクの）メンバー
  const adviceTargets = isOwner
    ? resolveEmployeeOptions(
        openTask?.responsibleEmployeeId ? [openTask.responsibleEmployeeId] : [],
        employees,
        currentEmployeeId
      )
    : isResponsibleOfOpenTask
      ? resolveEmployeeOptions(openTask?.memberEmployeeIds ?? [], employees, currentEmployeeId)
      : []
  // suggestion: （そのタスクの）メンバー→責任者、責任者→オーナー
  const suggestionTargets = isMemberOfOpenTask
    ? resolveEmployeeOptions(
        openTask?.responsibleEmployeeId ? [openTask.responsibleEmployeeId] : [],
        employees,
        currentEmployeeId
      )
    : isResponsibleOfOpenTask && participants.objectiveOwner
      ? [participants.objectiveOwner]
      : []
  // report: 責任者→オーナーのみ（目標責任者は1人のみのためグループ全体/タスク単位の差がなく、
  // 元々タスク単位で正しくスコープされている。Finding 4の対象外）
  const reportTargets =
    isResponsibleOfOpenTask && participants.objectiveOwner ? [participants.objectiveOwner] : []

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">タスク一覧</h2>
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
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
