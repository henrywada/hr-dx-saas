'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ListTodo } from 'lucide-react'
import { SimpleTaskCard } from './SimpleTaskCard'
import { TaskActionModal, type TaskActionSection } from './TaskActionModal'
import { deleteTask } from '../actions'
import { isTaskResponsible } from '../permissions'
import type { CommentType, Task, TaskComment } from '../types'
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
  /** ログインユーザー宛てのコメント（ある場合のみ「あなたに投稿があります」を表示） */
  addressedComments: TaskComment[]
}

const COMMENT_TYPE_LABEL: Record<CommentType, string> = {
  report: '報告',
  advice: '助言',
  suggestion: '提案',
  general: 'コメント',
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

/** タスクカードのグリッド表示 + 分割アクションモーダルの管理。 */
export function ObjectiveTaskBoard({
  tasks,
  employees,
  employeeNameById,
  divisions,
  employeeDivisionById,
  currentEmployeeId,
  isObjectiveOwner: isOwner,
  participants,
  addressedComments,
}: ObjectiveTaskBoardProps) {
  const router = useRouter()
  const [active, setActive] = useState<{
    taskId: string
    section: TaskActionSection
    replyToCommentId?: string
  } | null>(null)
  const [isAddressedOpen, setIsAddressedOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const taskTitleById = Object.fromEntries(tasks.map(t => [t.id, t.title]))

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

  const openTask = active ? (tasks.find(t => t.id === active.taskId) ?? null) : null

  const isResponsibleOfOpenTask =
    currentEmployeeId && openTask
      ? isTaskResponsible(openTask.responsibleEmployeeId, currentEmployeeId)
      : false
  const isMemberOfOpenTask =
    currentEmployeeId && openTask ? openTask.memberEmployeeIds.includes(currentEmployeeId) : false

  // 最終レビュー Finding 4: 宛先候補はタスクグループ全体（participants.managers/members、
  // 他タスクの責任者・メンバーも含む）ではなく、いま開いているタスク自身の
  // responsibleEmployeeId/memberEmployeeIds に絞る（design.md セクション4の
  // タスク単位の宛先ルーティングに合わせる）。
  const adviceTargets = isOwner
    ? resolveEmployeeOptions(
        openTask?.responsibleEmployeeId ? [openTask.responsibleEmployeeId] : [],
        employees,
        currentEmployeeId
      )
    : isResponsibleOfOpenTask
      ? resolveEmployeeOptions(openTask?.memberEmployeeIds ?? [], employees, currentEmployeeId)
      : []
  // 「提案」: 責任者・目標責任者 → タスクメンバー / メンバー → タスク責任者
  const suggestionTargets =
    isResponsibleOfOpenTask || isOwner
      ? resolveEmployeeOptions(openTask?.memberEmployeeIds ?? [], employees, currentEmployeeId)
      : isMemberOfOpenTask
        ? resolveEmployeeOptions(
            openTask?.responsibleEmployeeId ? [openTask.responsibleEmployeeId] : [],
            employees,
            currentEmployeeId
          )
        : []
  const reportTargets =
    isResponsibleOfOpenTask && participants.objectiveOwner ? [participants.objectiveOwner] : []
  // 「コメント」の宛先は目標責任者＋タスクメンバーのみ（本人は除外・重複除去）
  const generalTargets = resolveEmployeeOptions(
    [
      ...(participants.objectiveOwner ? [participants.objectiveOwner.id] : []),
      ...(openTask?.memberEmployeeIds ?? []),
    ].filter((id, index, arr) => arr.indexOf(id) === index),
    employees,
    currentEmployeeId
  )

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <ListTodo className="h-4 w-4 text-[#FD7601]" strokeWidth={2} />
          タスク一覧
        </h2>
        {addressedComments.length > 0 && (
          <button
            type="button"
            onClick={() => setIsAddressedOpen(true)}
            className="rounded-lg border border-[#FD7601]/40 bg-[#FD7601]/10 px-2.5 py-1 text-[10px] font-medium text-[#FD7601] hover:bg-[#FD7601]/15"
          >
            あなたに投稿があります（{addressedComments.length}）
          </button>
        )}
      </div>
      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500">タスクがまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(task => {
            const isResponsible = currentEmployeeId
              ? isTaskResponsible(task.responsibleEmployeeId, currentEmployeeId)
              : false
            return (
              <SimpleTaskCard
                key={task.id}
                task={task}
                employeeNameById={employeeNameById}
                isResponsible={isResponsible}
                isObjectiveOwner={isOwner}
                disabled={isPending}
                onOpenSection={section => setActive({ taskId: task.id, section })}
                onDelete={() => handleDelete(task.id)}
              />
            )
          })}
        </div>
      )}

      {openTask && active && (
        <TaskActionModal
          key={`${openTask.id}-${active.section}-${active.replyToCommentId ?? 'new'}`}
          task={openTask}
          section={active.section}
          onClose={() => setActive(null)}
          currentEmployeeId={currentEmployeeId}
          canModerateComments={isOwner}
          canPostComment={
            isOwner ||
            isResponsibleOfOpenTask ||
            (currentEmployeeId != null && openTask.memberEmployeeIds.includes(currentEmployeeId))
          }
          canLogWork={isResponsibleOfOpenTask}
          canOperateStatus={isResponsibleOfOpenTask}
          canManageAssignees={isResponsibleOfOpenTask}
          assignableEmployees={employees}
          adviceTargets={adviceTargets}
          suggestionTargets={suggestionTargets}
          reportTargets={reportTargets}
          generalTargets={generalTargets}
          employeeNameById={employeeNameById}
          divisions={divisions}
          employeeDivisionById={employeeDivisionById}
          initialReplyToCommentId={active.replyToCommentId ?? null}
        />
      )}

      {isAddressedOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => setIsAddressedOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">あなた宛ての投稿</h3>
                <p className="mt-0.5 text-xs text-slate-500">{addressedComments.length}件</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddressedOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
            <ul className="mt-3 space-y-2">
              {addressedComments.map(comment => (
                <li key={comment.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-medium text-slate-900">
                      {comment.taskId
                        ? (taskTitleById[comment.taskId] ?? comment.taskId)
                        : '（タスク不明）'}
                    </p>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                      {COMMENT_TYPE_LABEL[comment.commentType]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">
                    送信元：{comment.employeeName}
                    <span className="ml-3">
                      送信日時：{comment.createdAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{comment.body}</p>
                  {comment.taskId && (
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddressedOpen(false)
                          setActive({
                            taskId: comment.taskId!,
                            section: 'comment',
                            replyToCommentId: comment.id,
                          })
                        }}
                        className="text-[10px] font-medium text-[#FD7601] hover:underline"
                      >
                        返信
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isPending && <p className="text-xs text-slate-400">処理中...</p>}
    </section>
  )
}
