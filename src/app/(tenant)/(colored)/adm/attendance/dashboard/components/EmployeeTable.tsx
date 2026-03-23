'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { APP_ROUTES } from '@/config/routes'
import { getEmployeeAttendanceList } from '@/features/attendance/actions'
import type {
  AttendanceStatusTier,
  EmployeeAttendanceListFilters,
  EmployeeAttendanceOverviewFilter,
  EmployeeAttendancePageResult,
} from '@/features/attendance/types'
import { STATUS_TIER_LABEL } from '@/features/attendance/status'

const PAGE_SIZE = 20

function formatMinutesJp(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}:${String(mm).padStart(2, '0')}`
}

const TIER_CLASS: Record<AttendanceStatusTier, string> = {
  normal: 'bg-green-50 text-green-700',
  caution: 'bg-yellow-50 text-yellow-700',
  warning: 'bg-orange-50 text-orange-700',
  danger: 'bg-red-50 text-red-700',
}

type SortKey = NonNullable<EmployeeAttendanceListFilters['sortKey']>

type EmployeeTableProps = {
  year: number
  month: number
  overviewFilter: EmployeeAttendanceOverviewFilter
  initialList: EmployeeAttendancePageResult
  divisions: { id: string; name: string }[]
}

export function EmployeeTable({
  year,
  month,
  overviewFilter,
  initialList,
  divisions,
}: EmployeeTableProps) {
  const [result, setResult] = useState(initialList)
  const [isPending, startTransition] = useTransition()
  const [page, setPage] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [divisionId, setDivisionId] = useState('')
  const [statusTier, setStatusTier] = useState<AttendanceStatusTier | ''>('')
  const [nameSearch, setNameSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(nameSearch.trim()), 300)
    return () => clearTimeout(t)
  }, [nameSearch])

  const runFetch = useCallback(() => {
    startTransition(async () => {
      const r = await getEmployeeAttendanceList(year, month, {
        offset: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        sortKey,
        sortDir,
        divisionId: divisionId || undefined,
        statusTier: statusTier || undefined,
        nameSearch: debouncedSearch || undefined,
        overviewFilter,
      })
      if (r.ok) setResult(r.data)
    })
  }, [
    year,
    month,
    page,
    sortKey,
    sortDir,
    divisionId,
    statusTier,
    debouncedSearch,
    overviewFilter,
  ])

  useEffect(() => {
    runFetch()
  }, [runFetch])

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  const handleDivisionChange = (v: string) => {
    setDivisionId(v)
    setPage(0)
  }

  const handleStatusChange = (v: string) => {
    setStatusTier(v === '' ? '' : (v as AttendanceStatusTier))
    setPage(0)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-end gap-3 lg:justify-between">
        <h2 className="text-lg font-bold text-slate-800">従業員別勤怠一覧</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-xs text-slate-500 sr-only" htmlFor="att-search">
            氏名検索
          </label>
          <input
            id="att-search"
            type="search"
            placeholder="氏名で検索"
            value={nameSearch}
            onChange={(e) => {
              setNameSearch(e.target.value)
              setPage(0)
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-full sm:w-44"
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            value={divisionId}
            onChange={(e) => handleDivisionChange(e.target.value)}
            aria-label="部署で絞り込み"
          >
            <option value="">全ての部署</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
            value={statusTier}
            onChange={(e) => handleStatusChange(e.target.value)}
            aria-label="ステータスで絞り込み"
          >
            <option value="">全ステータス</option>
            <option value="normal">{STATUS_TIER_LABEL.normal}</option>
            <option value="caution">{STATUS_TIER_LABEL.caution}</option>
            <option value="warning">{STATUS_TIER_LABEL.warning}</option>
            <option value="danger">{STATUS_TIER_LABEL.danger}</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        アラート件数は<strong>選択月の発生件数</strong>（解決済み含む）です。
      </p>

      <div
        className={`overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm ${isPending ? 'opacity-70' : ''} transition-opacity`}
      >
        <table className="min-w-[720px] w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <th className="p-3">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('name')}>
                  従業員名 {sortIndicator('name')}
                </button>
              </th>
              <th className="p-3">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('division')}>
                  部署 {sortIndicator('division')}
                </button>
              </th>
              <th className="p-3">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('total_minutes')}>
                  総労働(h:mm) {sortIndicator('total_minutes')}
                </button>
              </th>
              <th className="p-3">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('overtime_minutes')}>
                  残業(h:mm) {sortIndicator('overtime_minutes')}
                </button>
              </th>
              <th className="p-3">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('holiday_minutes')}>
                  休出(h:mm) {sortIndicator('holiday_minutes')}
                </button>
              </th>
              <th className="p-3" title="選択月に発生したアラート件数">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('alert_count')}>
                  アラート {sortIndicator('alert_count')}
                </button>
              </th>
              <th className="p-3">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('status')}>
                  ステータス {sortIndicator('status')}
                </button>
              </th>
              <th className="p-3 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => {
              const href = `${APP_ROUTES.TENANT.ADMIN_ATTENDANCE_DASHBOARD}?highlightEmployeeId=${row.employeeId}`
              return (
                <tr key={row.employeeId} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="p-3 font-medium text-slate-900">{row.name}</td>
                  <td className="p-3 text-slate-600">{row.divisionName}</td>
                  <td className="p-3 font-mono text-slate-700">{formatMinutesJp(row.totalMinutes)}</td>
                  <td className="p-3 font-mono text-slate-700">{formatMinutesJp(row.overtimeMinutes)}</td>
                  <td className="p-3 font-mono text-slate-700">{formatMinutesJp(row.holidayMinutes)}</td>
                  <td className="p-3 text-center">{row.alertCountInMonth}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${TIER_CLASS[row.statusTier]}`}
                    >
                      {STATUS_TIER_LABEL[row.statusTier]}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link
                      href={href}
                      className="inline-flex items-center justify-center font-medium rounded-lg border-2 border-primary text-primary hover:bg-primary-light px-4 py-2 text-sm transition-all"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              )
            })}
            {result.rows.length === 0 && !isPending ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  該当する従業員がありません
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          {result.total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, result.total)} /{' '}
          {result.total} 件
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 0 || isPending}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            前へ
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1 || isPending}
            onClick={() => setPage((p) => p + 1)}
          >
            次へ
          </Button>
        </div>
      </div>
    </div>
  )
}
