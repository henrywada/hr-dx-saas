'use client'

import { useState } from 'react'
import { EmployeePicker } from './EmployeePicker'
import type { EmployeeOption } from '../employee-filter'

interface MultiEmployeePickerProps {
  employees: EmployeeOption[]
  value: string[]
  onChange: (employeeIds: string[]) => void
}

/**
 * 複数の従業員を選択するUI。EmployeePicker（単一選択コンボボックス）で1名ずつ追加し、
 * 追加済みの従業員はチップ表示で個別に解除できる（MemberAssignForm.tsxのチップ+追加フォーム
 * パターンをクライアント側完結（サーバーアクション呼び出し無し）に単純化したもの）。
 */
export function MultiEmployeePicker({ employees, value, onChange }: MultiEmployeePickerProps) {
  const [pendingId, setPendingId] = useState('')

  const selectable = employees.filter(e => !value.includes(e.id))

  function employeeName(id: string): string {
    return employees.find(e => e.id === id)?.name ?? id
  }

  function handleAdd() {
    if (!pendingId) return
    onChange([...value, pendingId])
    setPendingId('')
  }

  function handleRemove(id: string) {
    onChange(value.filter(existingId => existingId !== id))
  }

  return (
    <div className="space-y-1.5">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map(id => (
            <li
              key={id}
              className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs"
            >
              {employeeName(id)}
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="text-slate-400 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-1.5">
        <div className="w-56">
          <EmployeePicker
            employees={selectable}
            value={pendingId}
            onChange={setPendingId}
            placeholder="担当者を検索して追加"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!pendingId}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
        >
          追加
        </button>
      </div>
    </div>
  )
}
