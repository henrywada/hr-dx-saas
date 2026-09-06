'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import { EMPLOYMENT_JUDGMENT_LABEL, type EmploymentJudgment } from '@/features/health-check/types'

export type DoctorQueueRow = {
  id: string
  employee_name: string
  division_name: string | null
  exam_date: string
  overall_standard_code: string | null
  doctor_judgment_code: string | null
  employment_judgment: EmploymentJudgment
}

type SortableKey =
  | 'employee_name'
  | 'division_name'
  | 'exam_date'
  | 'overall_standard_code'
  | 'doctor_judgment_code'
  | 'employment_judgment'

type SortOrder = 'asc' | 'desc' | null

const COLUMNS: { key: SortableKey; label: string }[] = [
  { key: 'employee_name', label: '氏名' },
  { key: 'division_name', label: '部署' },
  { key: 'exam_date', label: '受診日' },
  { key: 'overall_standard_code', label: '標準総合判定' },
  { key: 'doctor_judgment_code', label: '産業医判定' },
  { key: 'employment_judgment', label: '就業判定' },
]

function getSortValue(row: DoctorQueueRow, key: SortableKey): string {
  if (key === 'employment_judgment') {
    return EMPLOYMENT_JUDGMENT_LABEL[row.employment_judgment]
  }
  return row[key] ?? ''
}

export function DoctorQueueTable({ title, rows }: { title: string; rows: DoctorQueueRow[] }) {
  const [sortKey, setSortKey] = useState<SortableKey | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(null)

  const sortedRows = useMemo(() => {
    if (!sortKey || !sortOrder) return rows
    const compareFn = (a: DoctorQueueRow, b: DoctorQueueRow) => {
      const result = getSortValue(a, sortKey).localeCompare(getSortValue(b, sortKey), 'ja')
      return sortOrder === 'asc' ? result : -result
    }
    return [...rows].sort(compareFn)
  }, [rows, sortKey, sortOrder])

  const toggleSort = (key: SortableKey) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortOrder('asc')
      return
    }
    if (sortOrder === 'asc') {
      setSortOrder('desc')
      return
    }
    setSortKey(null)
    setSortOrder(null)
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-x-auto">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
        <h2 className="text-xs font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-600">
          合計 <span className="font-semibold tabular-nums text-slate-900">{rows.length}</span>件
        </p>
      </div>
      <table className="w-full text-xs border-collapse mt-2">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-1 px-4 w-12">No</th>
            {COLUMNS.map(column => (
              <th key={column.key} className="text-left py-1 px-4">
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="flex items-center gap-1 hover:text-slate-900"
                >
                  {column.label}
                  {sortKey === column.key && sortOrder === 'asc' && (
                    <ChevronUp className="w-3 h-3 text-(--brand)" />
                  )}
                  {sortKey === column.key && sortOrder === 'desc' && (
                    <ChevronDown className="w-3 h-3 text-(--brand)" />
                  )}
                  {sortKey !== column.key && <ChevronsUpDown className="w-3 h-3 text-slate-400" />}
                </button>
              </th>
            ))}
            <th className="py-1 px-4" />
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, index) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-[#f6f8fa]">
              <td className="py-1 px-4 text-slate-500">{index + 1}</td>
              <td className="py-1 px-4">{r.employee_name}</td>
              <td className="py-1 px-4">{r.division_name ?? '—'}</td>
              <td className="py-1 px-4">{r.exam_date}</td>
              <td className="py-1 px-4">{r.overall_standard_code ?? '—'}</td>
              <td className="py-1 px-4">{r.doctor_judgment_code ?? '—'}</td>
              <td className="py-1 px-4">{EMPLOYMENT_JUDGMENT_LABEL[r.employment_judgment]}</td>
              <td className="py-1 px-4">
                <Link
                  href={APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_REVIEW_DETAIL(r.id)}
                  className="font-semibold text-(--brand) hover:underline"
                >
                  開く
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="px-4 py-6 text-xs text-slate-400">該当者はいません</p>}
    </div>
  )
}
