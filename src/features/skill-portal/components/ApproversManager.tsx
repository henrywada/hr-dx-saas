'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import type { SkillApprover } from '../types'
import { addSkillApprover, removeSkillApprover } from '../actions'

type Employee = { id: string; name: string | null; employee_no: string | null }

type Props = {
  approvers: SkillApprover[]
  allEmployees: Employee[]
}

export function ApproversManager({ approvers, allEmployees }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [approverId, setApproverId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function empLabel(e: Employee) {
    const name = e.name?.trim() ?? '—'
    return e.employee_no ? `${name}（${e.employee_no}）` : name
  }

  function handleAdd() {
    if (!employeeId || !approverId) { setError('従業員と承認者の両方を選択してください'); return }
    if (employeeId === approverId) { setError('同一人物は設定できません'); return }
    setError(null)
    startTransition(async () => {
      const result = await addSkillApprover({ employeeId, approverId })
      if (!result.success) { setError((result as { success: false; error: string }).error); return }
      setEmployeeId('')
      setApproverId('')
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => { await removeSkillApprover(id) })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-800">承認者を追加</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">対象従業員</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              {allEmployees.map(e => <option key={e.id} value={e.id}>{empLabel(e)}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">上長（承認者）</label>
            <select
              value={approverId}
              onChange={e => setApproverId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              {allEmployees.map(e => <option key={e.id} value={e.id}>{empLabel(e)}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            追加
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {approvers.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">承認者が設定されていません</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">対象従業員</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">上長（承認者）</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-center text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {approvers.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-800">
                    {a.employee?.name ?? '—'}
                    {a.employee?.employee_no && (
                      <span className="ml-1 font-mono text-xs text-gray-400">（{a.employee.employee_no}）</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {a.approver?.name ?? '—'}
                    {a.approver?.employee_no && (
                      <span className="ml-1 font-mono text-xs text-gray-400">（{a.approver.employee_no}）</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(a.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
