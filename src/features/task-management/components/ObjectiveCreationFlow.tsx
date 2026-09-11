'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createObjective } from '../actions'
import { SimpleTaskForm } from './SimpleTaskForm'
import { APP_ROUTES } from '@/config/routes'
import type { EmployeeOption } from '../employee-filter'

interface CreatedTask {
  id: string
  title: string
  goalSummary: string | null
  responsibleEmployeeId: string
}

interface ObjectiveCreationFlowProps {
  managers: EmployeeOption[]
}

/**
 * 目標作成 → タスク作成（複数回）を1画面で行うフロー。
 * 目標作成前は Step1（ObjectiveForm相当のインラインフォーム）、
 * 作成後は Step2（タスク作成ボタン + 作成済みタスクのカード一覧）を表示する。
 */
export function ObjectiveCreationFlow({ managers }: ObjectiveCreationFlowProps) {
  const [objective, setObjective] = useState<{ id: string; taskGroupId: string } | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tasks, setTasks] = useState<CreatedTask[]>([])

  function handleCreateObjective(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const { id, defaultTaskGroupId } = await createObjective({
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
        })
        setObjective({ id, taskGroupId: defaultTaskGroupId })
      } catch (err) {
        setError(err instanceof Error ? err.message : '目標の作成に失敗しました')
      }
    })
  }

  if (!objective) {
    return (
      <form onSubmit={handleCreateObjective} className="space-y-3">
        <h1 className="text-lg font-semibold text-slate-900">新しい目標を作成</h1>
        <label className="block text-xs font-medium text-slate-700">
          目標名
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          説明
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          期限
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          />
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          目標を作成
        </button>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={APP_ROUTES.tasks.root} className="text-xs text-slate-500 underline">
          ← 戻る
        </Link>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white"
        >
          タスクの作成
        </button>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500">タスクがまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(t => (
            <div key={t.id} className="rounded-lg border border-slate-200 bg-white">
              <p className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-900">
                {t.title}
              </p>
              <div className="p-3 text-xs text-slate-500">
                {t.goalSummary && <p>{t.goalSummary}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <SimpleTaskForm
          taskGroupId={objective.taskGroupId}
          managers={managers}
          onClose={() => setIsModalOpen(false)}
          onCreated={task => {
            setTasks(prev => [...prev, task])
            setIsModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
