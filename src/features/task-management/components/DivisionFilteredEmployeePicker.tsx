'use client'

import { useMemo, useState } from 'react'
import { EmployeePicker } from './EmployeePicker'
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
}

/** 組織階層（division）で従業員を絞り込んでから選択する2段階ピッカー。 */
export function DivisionFilteredEmployeePicker({
  employees,
  employeeDivisionById,
  divisions,
  value,
  onChange,
}: DivisionFilteredEmployeePickerProps) {
  const [selectedDivisionId, setSelectedDivisionId] = useState('')

  const flatDivisions = useMemo(
    () => divisions.slice().sort((a, b) => a.layer - b.layer || a.name.localeCompare(b.name)),
    [divisions]
  )

  const filteredEmployees = selectedDivisionId
    ? employees.filter(e => employeeDivisionById[e.id] === selectedDivisionId)
    : employees

  return (
    <div className="space-y-1.5">
      <select
        value={selectedDivisionId}
        onChange={e => setSelectedDivisionId(e.target.value)}
        className="block w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
      >
        <option value="">すべての組織</option>
        {flatDivisions.map(d => (
          <option key={d.id} value={d.id}>
            {'　'.repeat(d.layer - 1)}
            {d.name}
          </option>
        ))}
      </select>
      <EmployeePicker employees={filteredEmployees} value={value} onChange={onChange} />
    </div>
  )
}
