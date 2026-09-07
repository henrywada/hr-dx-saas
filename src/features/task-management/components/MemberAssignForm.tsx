'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignMember, removeMember } from '../actions'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface MemberAssignFormProps {
  taskGroupId: string
  memberEmployeeIds: string[]
  employees: EmployeeOption[]
}

/**
 * タスクグループのメンバー一覧表示と追加・解除フォーム。
 * 追加・解除可否（責任者またはマネージャー）は RLS が強制するため、失敗時はエラーメッセージで通知する。
 */
export function MemberAssignForm({
  taskGroupId,
  memberEmployeeIds,
  employees,
}: MemberAssignFormProps) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await assignMember({ taskGroupId, employeeId })
        setEmployeeId('')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'メンバーの追加に失敗しました')
      }
    })
  }

  function handleRemove(targetEmployeeId: string) {
    setError(null)
    startTransition(async () => {
      try {
        await removeMember({ taskGroupId, employeeId: targetEmployeeId })
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'メンバーの解除に失敗しました')
      }
    })
  }

  function employeeName(id: string): string {
    return employees.find(e => e.id === id)?.name ?? id
  }

  return (
    <div className="space-y-2">
      <ul className="flex flex-wrap gap-2">
        {memberEmployeeIds.map(id => (
          <li
            key={id}
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs"
          >
            {employeeName(id)}
            <button
              type="button"
              onClick={() => handleRemove(id)}
              disabled={isPending}
              className="text-slate-400 hover:text-red-600 disabled:opacity-50"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleAdd} className="flex items-end gap-2">
        <label className="text-xs font-medium text-slate-700">
          追加するメンバー
          <div className="mt-1 w-56">
            <EmployeePicker employees={employees} value={employeeId} onChange={setEmployeeId} />
          </div>
        </label>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isPending || !employeeId}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          追加
        </button>
      </form>
    </div>
  )
}
