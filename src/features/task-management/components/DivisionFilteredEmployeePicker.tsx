'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { EmployeePicker } from './EmployeePicker'
import {
  flattenDivisionsInTreeOrder,
  collectDivisionAndDescendantIds,
} from '../division-tree'
import type { EmployeeOption } from '../employee-filter'

interface DivisionOption {
  id: string
  name: string
  parentId: string | null
  layer: number
}

interface DivisionFilteredEmployeePickerProps {
  employees: EmployeeOption[]
  employeeDivisionById: Record<string, string | null>
  divisions: DivisionOption[]
  value: string
  onChange: (employeeId: string) => void
  /** 氏名検索欄の右に並べる操作（例: 「追加」ボタン） */
  action?: ReactNode
}

/** 組織階層（division）で従業員を絞り込んでから選択する2段階ピッカー。 */
export function DivisionFilteredEmployeePicker({
  employees,
  employeeDivisionById,
  divisions,
  value,
  onChange,
  action,
}: DivisionFilteredEmployeePickerProps) {
  const [selectedDivisionId, setSelectedDivisionId] = useState('')

  const treeOptions = useMemo(() => flattenDivisionsInTreeOrder(divisions), [divisions])

  const filteredEmployees = useMemo(() => {
    if (!selectedDivisionId) return employees
    const allowed = collectDivisionAndDescendantIds(selectedDivisionId, divisions)
    return employees.filter(e => {
      const divId = employeeDivisionById[e.id]
      return divId != null && allowed.has(divId)
    })
  }, [selectedDivisionId, employees, employeeDivisionById, divisions])

  return (
    <div className="space-y-1.5">
      <select
        value={selectedDivisionId}
        onChange={e => setSelectedDivisionId(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono"
      >
        <option value="">すべての組織</option>
        {treeOptions.map(d => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
      <div className="flex items-start gap-1.5">
        <div className="min-w-0 flex-1">
          <EmployeePicker employees={filteredEmployees} value={value} onChange={onChange} />
        </div>
        {action}
      </div>
    </div>
  )
}
