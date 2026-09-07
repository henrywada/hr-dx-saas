'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignManager } from '../actions'

interface ManagerAssignFormProps {
  taskGroupId: string
}

/**
 * タスクグループにマネージャーを割り当てるフォーム。
 * Phase1 では従業員選択を employeeId のテキスト入力とする（Task13 で従業員選択UIに置き換え検討）。
 * 割当可否（責任者のみ）は RLS が強制するため、失敗時はエラーメッセージで通知する。
 */
export function ManagerAssignForm({ taskGroupId }: ManagerAssignFormProps) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await assignManager({ taskGroupId, employeeId })
        setEmployeeId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'マネージャーの割当に失敗しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="text-xs font-medium text-slate-700">
        マネージャーの従業員ID
        <input
          value={employeeId}
          onChange={e => setEmployeeId(e.target.value)}
          required
          className="mt-1 block rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        割り当てる
      </button>
    </form>
  )
}
