'use client'

import { useMemo, useState } from 'react'
import { Filter, Users } from 'lucide-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { ACTIVE_STATUS_LABELS } from '@/features/organization/types'
import type { DirectoryEmployee, Division } from '../types'

interface DirectoryListProps {
  employees: DirectoryEmployee[]
  divisions: Division[]
}

export function DirectoryList({ employees, divisions }: DirectoryListProps) {
  const [filterDivision, setFilterDivision] = useState('')

  const filteredEmployees = useMemo(() => {
    if (!filterDivision) return employees
    if (filterDivision === '__unassigned__') {
      return employees.filter(emp => !emp.division_id)
    }
    return employees.filter(emp => emp.division_id === filterDivision)
  }, [employees, filterDivision])

  const columns: Column<DirectoryEmployee>[] = [
    {
      key: 'name',
      label: '氏名',
      sortable: true,
      render: val => <div className="font-medium text-slate-900">{val || '名前未設定'}</div>,
    },
    {
      key: 'employee_no',
      label: '社員番号',
      sortable: true,
      render: val => <div className="font-mono text-xs text-slate-500">{val || '---'}</div>,
    },
    {
      key: 'division_id',
      label: '部署',
      sortable: false,
      render: (_, emp) => (
        <div className="text-slate-600">
          {emp.division?.name || <span className="text-amber-500 text-xs">未所属</span>}
        </div>
      ),
    },
    {
      key: 'job_title',
      label: '役職',
      sortable: true,
      render: val => <div className="text-slate-600 hidden md:block">{val || '---'}</div>,
    },
    {
      key: 'active_status',
      label: 'ステータス',
      sortable: false,
      render: val => {
        const status = ACTIVE_STATUS_LABELS[val as string] || {
          label: val || '---',
          color: 'bg-slate-100 text-slate-600',
        }
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
          >
            {status.label}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Users className="w-4 h-4" />
          {filteredEmployees.length}名
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filterDivision}
            onChange={e => setFilterDivision(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601] outline-none bg-white"
          >
            <option value="">全部署</option>
            <option value="__unassigned__">未所属</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredEmployees}
        searchable
        searchPlaceholder="氏名・社員番号で検索..."
        searchKey="name"
        getRowId={item => item.id}
      />
    </div>
  )
}
