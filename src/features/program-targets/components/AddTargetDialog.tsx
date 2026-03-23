'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { EmployeeForTargetSelection } from '../types'
import type { ProgramType } from '../types'

interface AddTargetDialogProps {
  open: boolean
  onClose: () => void
  employees: EmployeeForTargetSelection[]
  programType: ProgramType
  instanceId: string
  onAdd: (
    programType: ProgramType,
    instanceId: string,
    employeeId: string
  ) => Promise<{ success: boolean; error?: string }>
}

export function AddTargetDialog({
  open,
  onClose,
  employees,
  programType,
  instanceId,
  onAdd,
}: AddTargetDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleAdd = async () => {
    if (!selectedId) return
    setError(null)
    setIsPending(true)
    const result = await onAdd(programType, instanceId, selectedId)
    setIsPending(false)
    if (result.success) {
      setSelectedId(null)
      onClose()
      window.location.reload()
    } else {
      setError(result.error || '追加に失敗しました')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">対象者を追加</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
          )}
          {employees.length === 0 ? (
            <p className="text-sm text-slate-500">
              追加可能な従業員がいません。全員が既に登録済みか、産業医等の除外対象です。
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                追加する従業員を選択してください（company_doctor は選択肢に含まれません）
              </p>
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSelectedId(e.target.value || null)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">-- 選択してください --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employee_no ? `${emp.employee_no} - ` : ''}
                    {emp.name || '（名前なし）'}
                    {emp.division_name ? ` (${emp.division_name})` : ''}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedId || isPending || employees.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? '追加中...' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  )
}
