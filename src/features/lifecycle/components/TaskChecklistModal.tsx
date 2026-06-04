'use client'

import { useState, useTransition, useMemo } from 'react'
import { updateTaskStatus, updateInstanceStatus, updateInstanceNotes } from '../actions'
import type { InstanceRow, TaskStatus } from '../types'

// LifecycleDashboard.tsx から import される。selectedInstance が非null の時にレンダリング。

interface Props {
  instance: InstanceRow
  onClose: () => void
}

const taskStatusLabel: Record<TaskStatus, string> = {
  pending: '未着手',
  in_progress: '対応中',
  completed: '完了',
}

const nextStatus: Record<TaskStatus, TaskStatus> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
}

const taskStatusClass: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export function TaskChecklistModal({ instance, onClose }: Props) {
  // ローカルステートで楽観的更新を管理（クリックで即反映、サーバー失敗時はロールバック）
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>(() =>
    Object.fromEntries(instance.tasks.map(t => [t.id, t.status]))
  )
  const [notes, setNotes] = useState(instance.notes ?? '')
  const [notesEditing, setNotesEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const completedCount = useMemo(
    () => Object.values(taskStatuses).filter(s => s === 'completed').length,
    [taskStatuses]
  )
  const totalCount = instance.tasks.length
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleTaskClick = (taskId: string) => {
    const current = taskStatuses[taskId] ?? 'pending'
    const next = nextStatus[current]
    setTaskStatuses(prev => ({ ...prev, [taskId]: next }))

    startTransition(async () => {
      const result = await updateTaskStatus(taskId, next)
      if (!result.success) {
        setTaskStatuses(prev => ({ ...prev, [taskId]: current }))
      }
    })
  }

  const handleCompleteInstance = () => {
    startTransition(async () => {
      await updateInstanceStatus(instance.id, 'completed')
      onClose()
    })
  }

  const handleSaveNotes = () => {
    startTransition(async () => {
      await updateInstanceNotes(instance.id, notes)
      setNotesEditing(false)
    })
  }

  const lifecycleLabel = instance.lifecycle_type === 'onboarding' ? '入社' : '退社'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {instance.employee_name} — {lifecycleLabel}チェックリスト
            </h2>
            {instance.scheduled_date && (
              <p className="text-xs text-gray-500 mt-0.5">
                {lifecycleLabel}予定日: {instance.scheduled_date}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* 進捗バー */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-gray-700">
                タスク進捗 ({completedCount}/{totalCount} 完了)
              </span>
              <span className="text-sm text-gray-500">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* タスク一覧（ボタンクリックで 未着手→対応中→完了→未着手 と循環） */}
          <ul className="space-y-2">
            {instance.tasks.map(task => {
              const status = taskStatuses[task.id] ?? task.status
              return (
                <li
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                >
                  <button
                    onClick={() => handleTaskClick(task.id)}
                    disabled={isPending}
                    className={`mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${taskStatusClass[status]}`}
                  >
                    {taskStatusLabel[status]}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                    )}
                    {task.assignee_name && (
                      <p className="text-xs text-gray-400 mt-0.5">担当: {task.assignee_name}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* 引き継ぎメモ / 備考 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">
                {instance.lifecycle_type === 'offboarding' ? '引き継ぎドキュメント' : 'メモ'}
              </h3>
              {!notesEditing && (
                <button
                  onClick={() => setNotesEditing(true)}
                  className="text-xs text-primary hover:underline"
                >
                  編集
                </button>
              )}
            </div>
            {notesEditing ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={5}
                  placeholder={
                    instance.lifecycle_type === 'offboarding'
                      ? '引き継ぎ内容・注意事項を記入...'
                      : 'メモを入力...'
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotesEditing(false)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveNotes}
                    disabled={isPending}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 min-h-[60px]">
                {notes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-sm text-gray-400">メモはありません</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        {instance.status === 'in_progress' && (
          <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 flex justify-between items-center">
            <p className="text-xs text-gray-500">全タスク完了後にワークフローを終了できます</p>
            <button
              onClick={handleCompleteInstance}
              disabled={isPending || completedCount < totalCount}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ワークフロー完了
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
