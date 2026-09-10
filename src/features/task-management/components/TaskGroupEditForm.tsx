'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTaskGroup } from '../actions'
import type { TaskGroup } from '../types'

interface TaskGroupEditFormProps {
  group: TaskGroup
}

/**
 * タスクグループの名前・説明・目標（達成基準）を編集するインラインフォーム。
 * 責任者・マネージャーいずれも編集可（task_groups_updateのRLSが最終防衛、要求18）。
 * 運用フロー図の「マネージャーがアサインされたタスクの目標を設定する」に対応する。
 */
export function TaskGroupEditForm({ group }: TaskGroupEditFormProps) {
  const router = useRouter()
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [goalSummary, setGoalSummary] = useState(group.goalSummary ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateTaskGroup({
          taskGroupId: group.id,
          name,
          description: description || undefined,
          goalSummary: goalSummary || undefined,
        })
        setIsEditing(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'タスクグループの更新に失敗しました')
      }
    })
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-[10px] text-[#FD7601]"
      >
        編集
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
      <label className="block text-xs font-medium text-slate-700">
        タスクグループ名
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        説明
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      <label className="block text-xs font-medium text-slate-700">
        目標（達成基準）
        <input
          value={goalSummary}
          onChange={e => setGoalSummary(e.target.value)}
          maxLength={200}
          placeholder="例: 改善案の3案を立案"
          className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          保存
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-xs text-slate-500"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
