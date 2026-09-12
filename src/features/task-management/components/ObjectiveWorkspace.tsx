'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteTask } from '../actions'
import { SimpleTaskForm, type CreatedTask, PRIORITY_LABEL } from './SimpleTaskForm'
import { APP_ROUTES } from '@/config/routes'
import type { EmployeeOption } from '../employee-filter'

export interface ObjectiveWorkspaceProps {
  /** 画面見出し（作成直後は「目標を作成しました」、編集時は「目標の編集」など） */
  heading: string
  objective: {
    id: string
    taskGroupId: string
    title: string
    description: string
    dueDate: string
  }
  managers: EmployeeOption[]
  initialTasks: CreatedTask[]
}

/**
 * 目標作成直後（Step2）および目標編集画面で共有するワークスペース。
 * 目標内容の確認 + タスクの作成／変更／削除を行う。
 */
export function ObjectiveWorkspace({
  heading,
  objective,
  managers,
  initialTasks,
}: ObjectiveWorkspaceProps) {
  const [isPending, startTransition] = useTransition()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<CreatedTask | null>(null)
  const [tasks, setTasks] = useState<CreatedTask[]>(initialTasks)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDeleteTask(taskId: string) {
    if (!window.confirm('このタスクを削除しますか？')) return
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteTask({ taskId })
        setTasks(prev => prev.filter(t => t.id !== taskId))
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'タスクの削除に失敗しました')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{heading}</h1>
        <Link href={APP_ROUTES.tasks.root} className="text-xs text-slate-500 underline">
          ← 一覧へ戻る
        </Link>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-3">
          <p className="text-[10px] font-medium text-slate-400">目標名</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{objective.title}</p>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <p className="text-[10px] font-medium text-slate-400">説明</p>
            <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-600">
              {objective.description.trim() ? objective.description : '（未入力）'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400">期限</p>
            <p className="mt-0.5 text-xs text-slate-600">{objective.dueDate || '（未設定）'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">タスク</h2>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white"
        >
          タスクの作成
        </button>
      </div>

      {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500">
          タスクがまだありません。「タスクの作成」から追加できます。
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(t => {
            const responsibleName =
              managers.find(m => m.id === t.responsibleEmployeeId)?.name ?? t.responsibleEmployeeId
            return (
              <div key={t.id} className="rounded-lg border border-slate-200 bg-white shadow-xs">
                <p className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-900">
                  {t.title}
                </p>
                <div className="space-y-1.5 p-3 text-xs text-slate-500">
                  {t.goalSummary && <p>{t.goalSummary}</p>}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
                    <span>期限: {t.dueDate ?? '未設定'}</span>
                    <span>優先順: {PRIORITY_LABEL[t.priority]}</span>
                    <span>タスク責任者: {responsibleName}</span>
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setEditingTask(t)}
                    disabled={isPending}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600 hover:bg-[#f6f8fa] disabled:opacity-50"
                  >
                    変更
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t.id)}
                    disabled={isPending}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isCreateModalOpen && (
        <SimpleTaskForm
          taskGroupId={objective.taskGroupId}
          managers={managers}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={task => {
            setTasks(prev => [...prev, task])
            setIsCreateModalOpen(false)
          }}
        />
      )}

      {editingTask && (
        <SimpleTaskForm
          key={editingTask.id}
          taskGroupId={objective.taskGroupId}
          managers={managers}
          initialTask={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={task => {
            setTasks(prev => prev.map(t => (t.id === task.id ? task : t)))
            setEditingTask(null)
          }}
        />
      )}
    </div>
  )
}
