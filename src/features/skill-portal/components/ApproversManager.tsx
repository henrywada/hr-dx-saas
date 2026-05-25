'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import type { SkillApprover, EvalApproverRow } from '../types'
import { addSkillApprover, removeSkillApprover } from '../actions'
import { EvalApproversManager } from './EvalApproversManager'

type Employee = { id: string; name: string | null; employee_no: string | null }

type Props = {
  approvers: SkillApprover[]
  allEmployees: Employee[]
  evalRows: EvalApproverRow[]
  activeTab: 'skill' | 'eval'
}

export function ApproversManager({ approvers, allEmployees, evalRows, activeTab }: Props) {
  const router = useRouter()

  function switchTab(tab: 'skill' | 'eval') {
    const params = new URLSearchParams()
    if (tab === 'eval') params.set('tab', 'eval')
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 w-fit">
        <button
          type="button"
          onClick={() => switchTab('skill')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'skill'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          上司承認
        </button>
        <button
          type="button"
          onClick={() => switchTab('eval')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            activeTab === 'eval'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          段階承認・評価
        </button>
      </div>

      {activeTab === 'skill' ? (
        <SkillApproversTab approvers={approvers} allEmployees={allEmployees} />
      ) : (
        <EvalApproversManager rows={evalRows} allEmployees={allEmployees} />
      )}
    </div>
  )
}

function SkillApproversTab({
  approvers,
  allEmployees,
}: {
  approvers: SkillApprover[]
  allEmployees: Employee[]
}) {
  const [employeeId, setEmployeeId] = useState('')
  const [approverId, setApproverId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function empLabel(e: Employee) {
    const name = e.name?.trim() ?? '—'
    return e.employee_no ? `${name}（${e.employee_no}）` : name
  }

  function handleAdd() {
    if (!employeeId || !approverId) {
      setError('従業員と承認者の両方を選択してください')
      return
    }
    if (employeeId === approverId) {
      setError('同一人物は設定できません')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await addSkillApprover({ employeeId, approverId })
      if (!result.success) {
        setError((result as { success: false; error: string }).error)
        return
      }
      setEmployeeId('')
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeSkillApprover(id)
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">上長（承認者）</label>
            <select
              value={approverId}
              onChange={e => {
                setApproverId(e.target.value)
                setError(null)
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              <option value="__all__">すべて</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>
                  {empLabel(e)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">対象従業員</label>
            <select
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              disabled={approverId === '__all__'}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value=""></option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>
                  {empLabel(e)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || approverId === '__all__'}
            className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            追加
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {!approverId ? (
          <p className="py-10 text-center text-sm text-gray-400">
            上長（承認者）を選択するとリストが表示されます
          </p>
        ) : (
          (() => {
            const filtered = (
              approverId === '__all__'
                ? approvers
                : approvers.filter(a => a.approver_id === approverId)
            )
              .slice()
              .sort((a, b) => {
                const approverCmp = (a.approver?.employee_no ?? '').localeCompare(
                  b.approver?.employee_no ?? '',
                  'ja',
                  { numeric: true }
                )
                if (approverCmp !== 0) return approverCmp
                return (a.employee?.employee_no ?? '').localeCompare(
                  b.employee?.employee_no ?? '',
                  'ja',
                  { numeric: true }
                )
              })
            const isAll = approverId === '__all__'
            return filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                この承認者に対象従業員が設定されていません
              </p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="w-12 border-b border-gray-200 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">
                      No
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">
                      上長（承認者）
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">
                      対象従業員
                    </th>
                    <th className="border-b border-gray-200 px-4 py-2.5 text-center text-xs font-semibold text-gray-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => {
                    const isGroupHead =
                      isAll && (i === 0 || filtered[i - 1].approver_id !== a.approver_id)
                    const rowBg = isGroupHead
                      ? 'bg-green-50'
                      : i % 2 === 0
                        ? 'bg-white'
                        : 'bg-gray-50'
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-gray-100 hover:bg-blue-50 ${rowBg}`}
                      >
                        <td className="w-12 px-2 py-2.5 text-center font-mono text-xs text-gray-500">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5 text-gray-800">
                          {a.approver?.name ?? '—'}
                          {a.approver?.employee_no && (
                            <span className="ml-1 font-mono text-xs text-gray-400">
                              （{a.approver.employee_no}）
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-gray-800">
                          {a.employee?.name ?? '—'}
                          {a.employee?.employee_no && (
                            <span className="ml-1 font-mono text-xs text-gray-400">
                              （{a.employee.employee_no}）
                            </span>
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
                    )
                  })}
                </tbody>
              </table>
            )
          })()
        )}
      </div>
    </div>
  )
}
