'use client'

import { useState, useTransition } from 'react'
import { deleteExitInterview } from '@/features/exit-interview/actions'
import { ExitInterviewForm } from './ExitInterviewForm'
import type { ExitInterview } from '@/features/exit-interview/types'
import { MAIN_REASON_LABELS, MAIN_REASON_COLORS } from '@/features/exit-interview/types'

interface Employee {
  id: string
  name: string
  department_name: string | null
}

interface Props {
  records: ExitInterview[]
  employees: Employee[]
}

export function ExitInterviewList({ records, employees }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ExitInterview | null>(null)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState('')

  function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」の退職面談記録を削除しますか？`)) return
    setDeleteError('')
    startTransition(async () => {
      const result = await deleteExitInterview(id)
      if (result.success === false) setDeleteError(result.error)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">面談記録一覧</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          + 記録を追加
        </button>
      </div>

      {deleteError && <p className="text-red-500 text-sm">{deleteError}</p>}

      {records.length === 0 && (
        <p className="text-sm text-slate-400 py-8 text-center">記録がありません</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="py-2 pr-3 font-medium text-slate-600 whitespace-nowrap">退職日</th>
              <th className="py-2 pr-3 font-medium text-slate-600">退職者</th>
              <th className="py-2 pr-3 font-medium text-slate-600">部署</th>
              <th className="py-2 pr-3 font-medium text-slate-600 whitespace-nowrap">在籍期間</th>
              <th className="py-2 pr-3 font-medium text-slate-600 whitespace-nowrap">主な理由</th>
              <th className="py-2 font-medium text-slate-600"></th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => {
              const tenureYears = Math.floor(r.tenure_months / 12)
              const tenureRem = r.tenure_months % 12
              const tenureLabel = tenureYears > 0
                ? `${tenureYears}年${tenureRem > 0 ? `${tenureRem}ヶ月` : ''}`
                : `${r.tenure_months}ヶ月`
              return (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">{r.exit_date}</td>
                  <td className="py-2 pr-3 font-medium text-slate-800">{r.employee_name}</td>
                  <td className="py-2 pr-3 text-slate-600">{r.department_name ?? '—'}</td>
                  <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{tenureLabel}</td>
                  <td className="py-2 pr-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: MAIN_REASON_COLORS[r.main_reason] }}
                    >
                      {MAIN_REASON_LABELS[r.main_reason]}
                    </span>
                  </td>
                  <td className="py-2 flex gap-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="text-xs text-slate-500 hover:text-primary"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(r.id, r.employee_name)}
                      disabled={isPending}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <ExitInterviewForm employees={employees} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <ExitInterviewForm record={editing} employees={employees} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
