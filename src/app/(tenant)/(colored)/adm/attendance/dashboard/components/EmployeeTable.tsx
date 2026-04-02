'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { getEmployeeAttendanceList } from '@/features/attendance/actions'
import type {
  AttendanceStatusTier,
  EmployeeAttendanceListFilters,
  EmployeeAttendanceOverviewFilter,
  EmployeeAttendancePageResult,
} from '@/features/attendance/types'
import { STATUS_TIER_LABEL } from '@/features/attendance/status'
import { EmployeeWorkTimeDetailDialog } from './EmployeeWorkTimeDetailDialog'

const PAGE_SIZE = 20

function formatMinutesJp(m: number): string {
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${h}:${String(mm).padStart(2, '0')}`
}

/** 0:00 は一覧ではブランク表示 */
function formatMinutesJpOrBlank(m: number): string {
  if (m === 0) return ''
  return formatMinutesJp(m)
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
  /** URL `highlightEmployeeId` から渡すと初回から詳細モーダルを開く */
  initialDetailEmployee?: { id: string; name: string } | null
}

export function EmployeeTable({
  year,
  month,
  overviewFilter,
  initialList,
  divisions,
  initialDetailEmployee = null,
}: EmployeeTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [detailTarget, setDetailTarget] = useState<{ employeeId: string; name: string } | null>(
    () => (initialDetailEmployee ? { employeeId: initialDetailEmployee.id, name: initialDetailEmployee.name } : null),
  )
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

  const openEmployeeDetail = (employeeId: string, name: string) => {
    setDetailTarget({ employeeId, name })
    const qs = new URLSearchParams()
    qs.set('year', String(year))
    qs.set('month', String(month))
    qs.set('highlightEmployeeId', employeeId)
    router.replace(`${pathname}?${qs.toString()}`)
  }

  const closeEmployeeDetail = (nextOpen: boolean) => {
    if (!nextOpen) {
      setDetailTarget(null)
      router.replace(`${pathname}?year=${year}&month=${month}`)
    }
  }

  /** URL の highlight だけ変わったとき（同一テーブルキーでマウントが残る）にモーダルを開く */
  useEffect(() => {
    if (!initialDetailEmployee) {
      return
    }
    setDetailTarget({
      employeeId: initialDetailEmployee.id,
      name: initialDetailEmployee.name,
    })
  }, [initialDetailEmployee?.id, initialDetailEmployee?.name])

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
        <table className="min-w-[720px] w-full text-sm leading-snug">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-600">
              <th className="w-12 py-2 px-2.5 text-center tabular-nums">No</th>
              <th className="py-2 px-2.5">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('division')}>
                  部署 {sortIndicator('division')}
                </button>
              </th>
              <th className="py-2 px-2.5">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('employee_no')}>
                  従業員番号 {sortIndicator('employee_no')}
                </button>
              </th>
              <th className="py-2 px-2.5">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('name')}>
                  従業員名 {sortIndicator('name')}
                </button>
              </th>
              <th className="py-2 px-2.5">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('total_minutes')}>
                  残業（承認） {sortIndicator('total_minutes')}
                </button>
              </th>
              <th className="py-2 px-2.5">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('overtime_minutes')}>
                  残業（却下） {sortIndicator('overtime_minutes')}
                </button>
              </th>
              <th className="py-2 px-2.5">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('holiday_minutes')}>
                  残業（申請中） {sortIndicator('holiday_minutes')}
                </button>
              </th>
              <th className="py-2 px-2.5" title="選択月に発生したアラート件数">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('alert_count')}>
                  アラート {sortIndicator('alert_count')}
                </button>
              </th>
              <th className="py-2 px-2.5">
                <button type="button" className="hover:text-primary" onClick={() => toggleSort('status')}>
                  ステータス {sortIndicator('status')}
                </button>
              </th>
              <th className="w-24 py-2 px-2.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => {
              return (
                <tr key={row.employeeId} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="py-1.5 px-2.5 text-center tabular-nums text-slate-600">
                    {page * PAGE_SIZE + index + 1}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600">{row.divisionName}</td>
                  <td className="py-1.5 px-2.5 font-mono text-xs text-slate-600">
                    {row.employeeNo?.trim() ? row.employeeNo.trim() : '—'}
                  </td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-900">{row.name}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{formatMinutesJpOrBlank(row.otApprovedMinutes)}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{formatMinutesJpOrBlank(row.otRejectedMinutes)}</td>
                  <td className="py-1.5 px-2.5 font-mono text-slate-700">{formatMinutesJpOrBlank(row.otPendingMinutes)}</td>
                  <td className="py-1.5 px-2.5 text-center">{row.alertCountInMonth}</td>
                  <td className="py-1.5 px-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-px text-[11px] font-semibold leading-tight ${TIER_CLASS[row.statusTier]}`}
                    >
                      {STATUS_TIER_LABEL[row.statusTier]}
                    </span>
                  </td>
                  <td className="py-1 px-2.5 align-middle">
                    {row.hasWorkTimeRecordsInMonth ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-2.5 py-1 text-xs font-medium text-primary transition-all hover:bg-primary-light"
                        onClick={() => openEmployeeDetail(row.employeeId, row.name)}
                      >
                        詳細
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
            {result.rows.length === 0 && !isPending ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-slate-500">
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

      <EmployeeWorkTimeDetailDialog
        open={detailTarget != null}
        onOpenChange={closeEmployeeDetail}
        year={year}
        month={month}
        employeeId={detailTarget?.employeeId ?? ''}
        employeeName={detailTarget?.name ?? ''}
      />
    </div>
  )
}
