'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import type { EvalApproverRow } from '../types'
import { upsertEvalApprovers, removeEvalApprovers } from '../actions'

type Employee = { id: string; name: string | null; employee_no: string | null }

type Props = {
  rows: EvalApproverRow[]
  allEmployees: Employee[]
}

function empLabel(e: Employee) {
  const name = e.name?.trim() ?? '—'
  return e.employee_no ? `${name}（${e.employee_no}）` : name
}

export function EvalApproversManager({ rows, allEmployees }: Props) {
  const [employeeId, setEmployeeId] = useState('')
  const [primaryId, setPrimaryId] = useState('')
  const [secondaryId, setSecondaryId] = useState('')
  const [confirmerId, setConfirmerId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!employeeId) {
      setError('対象従業員を選択してください')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await upsertEvalApprovers({
        employeeId,
        primaryApproverId: primaryId || null,
        secondaryApproverId: secondaryId || null,
        confirmerApproverId: confirmerId || null,
      })
      if (!result.success) {
        setError((result as { success: false; error: string }).error)
        return
      }
      setEmployeeId('')
      setPrimaryId('')
      setSecondaryId('')
      setConfirmerId('')
    })
  }

  function handleRemove(empId: string) {
    startTransition(async () => {
      await removeEvalApprovers({ employeeId: empId })
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">対象従業員</label>
            <select
              value={employeeId}
              onChange={e => { setEmployeeId(e.target.value); setError(null) }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value=""></option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">一次評価者</label>
            <select
              value={primaryId}
              onChange={e => setPrimaryId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">（なし）</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">二次評価者</label>
            <select
              value={secondaryId}
              onChange={e => setSecondaryId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">（なし）</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">確定者（最終）</label>
            <select
              value={confirmerId}
              onChange={e => setConfirmerId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">（なし）</option>
              {allEmployees.map(e => (
                <option key={e.id} value={e.id}>{empLabel(e)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
          >
            保存
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">評価者が設定されていません</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-10 border-b border-gray-200 px-2 py-2.5 text-center text-xs font-semibold text-gray-700">No</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">従業員</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">一次評価者</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">二次評価者</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-left text-xs font-semibold text-gray-700">確定者</th>
                <th className="border-b border-gray-200 px-4 py-2.5 text-center text-xs font-semibold text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.employee_id}
                  className={`border-b border-gray-100 hover:bg-blue-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="w-10 px-2 py-2.5 text-center font-mono text-xs text-gray-500">{i + 1}</td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.employee.name ?? '—'}
                    {row.employee.employee_no && (
                      <span className="ml-1 font-mono text-xs text-gray-400">（{row.employee.employee_no}）</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.primary ? (
                      <>
                        {row.primary.approver.name ?? '—'}
                        {row.primary.approver.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{row.primary.approver.employee_no}）</span>
                        )}
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.secondary ? (
                      <>
                        {row.secondary.approver.name ?? '—'}
                        {row.secondary.approver.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{row.secondary.approver.employee_no}）</span>
                        )}
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {row.confirmer ? (
                      <>
                        {row.confirmer.approver.name ?? '—'}
                        {row.confirmer.approver.employee_no && (
                          <span className="ml-1 font-mono text-xs text-gray-400">（{row.confirmer.approver.employee_no}）</span>
                        )}
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(row.employee_id)}
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
