'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { format, parseISO, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import {
  formatDateInJST,
  formatTimeInJSTFromIso,
} from '@/lib/datetime'
import {
  formatIsHolidayForDisplay,
  formatWorkTimeRecordSourceForDisplay,
} from '@/features/attendance/work-time-record-display'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const DETAIL_LIMIT = 2000

type MonthlyRow = {
  year_month: string
  row_count: number
}

type DetailRow = {
  record_date: string
  start_time: string | null
  end_time: string | null
  is_holiday: boolean | null
  source: string | null
  employees: { name: string | null } | { name: string | null }[] | null
}

function employeeNameFromRow(row: DetailRow): string {
  const e = row.employees
  if (e == null) {
    return '—'
  }
  if (Array.isArray(e)) {
    return e[0]?.name?.trim() || '—'
  }
  return e.name?.trim() || '—'
}

function formatRecordDateYmd(ymd: string): string {
  if (!ymd) return '—'
  try {
    return formatDateInJST(`${ymd}T12:00:00+09:00`)
  } catch {
    return ymd
  }
}

type WorkTimeRecordsMonthlySectionProps = {
  tenantId: string
  refreshKey?: number
}

export function WorkTimeRecordsMonthlySection({
  tenantId,
  refreshKey = 0,
}: WorkTimeRecordsMonthlySectionProps) {
  const swrKey = ['/api/adm/work-time-records/monthly-summary', tenantId, refreshKey] as const
  const { data: monthlyRows, error: monthlyError, isLoading: monthlyLoading } = useSWR<MonthlyRow[]>(
    swrKey,
    async () => {
      const res = await fetch('/api/adm/work-time-records/monthly-summary', {
        credentials: 'include',
      })
      const json: unknown = await res.json()
      if (!res.ok) {
        const msg =
          typeof json === 'object' &&
          json !== null &&
          'error' in json &&
          typeof (json as { error: unknown }).error === 'string'
            ? (json as { error: string }).error
            : '読み込みに失敗しました'
        throw new Error(msg)
      }
      if (
        typeof json !== 'object' ||
        json === null ||
        !('months' in json) ||
        !Array.isArray((json as { months: unknown }).months)
      ) {
        throw new Error('レスポンス形式が不正です')
      }
      return (json as { months: MonthlyRow[] }).months
    },
  )

  const [open, setOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTruncated, setDetailTruncated] = useState(false)

  const loadDetail = useCallback(
    async (yearMonthFirstDay: string) => {
      setDetailLoading(true)
      setDetailError(null)
      setDetailTruncated(false)
      try {
        const start = yearMonthFirstDay.slice(0, 10)
        const end = format(endOfMonth(parseISO(start)), 'yyyy-MM-dd')
        const supabase = createClient()
        const { data, error } = await supabase
          .from('work_time_records')
          .select('record_date, start_time, end_time, is_holiday, source, employees(name)')
          .gte('record_date', start)
          .lte('record_date', end)
          .order('record_date', { ascending: true })
          .limit(DETAIL_LIMIT + 1)

        if (error) {
          setDetailError(error.message)
          setDetailRows([])
          return
        }
        const rows = (data ?? []) as DetailRow[]
        if (rows.length > DETAIL_LIMIT) {
          setDetailTruncated(true)
          setDetailRows(rows.slice(0, DETAIL_LIMIT))
        } else {
          setDetailRows(rows)
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '読み込みに失敗しました'
        setDetailError(msg)
        setDetailRows([])
      } finally {
        setDetailLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (open && selectedMonth) {
      void loadDetail(selectedMonth)
    }
  }, [open, selectedMonth, loadDetail])

  const openDetail = (yearMonthFirstDay: string) => {
    setSelectedMonth(yearMonthFirstDay)
    setOpen(true)
  }

  const closeDetail = () => {
    setOpen(false)
    setSelectedMonth(null)
    setDetailRows([])
    setDetailError(null)
  }

  return (
    <Card title="登録済み勤怠実績（月別）" className="p-4!">
      {monthlyLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : monthlyError ? (
        <p className="text-sm text-red-600">{monthlyError.message}</p>
      ) : (
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-auto py-1.5 px-2 text-xs font-semibold">年月</TableHead>
              <TableHead className="h-auto py-1.5 px-2 text-right text-xs font-semibold">
                データ件数
              </TableHead>
              <TableHead className="h-auto w-28 min-w-28 py-1.5 px-2 text-center text-xs font-semibold">
                詳細
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(monthlyRows ?? []).length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="py-2 text-center text-slate-500">
                  登録データがありません
                </TableCell>
              </TableRow>
            ) : (
              (monthlyRows ?? []).map((row) => {
                const ym = row.year_month.slice(0, 10)
                const label = format(parseISO(ym), 'yyyy年M月', { locale: ja })
                return (
                  <TableRow
                    key={ym}
                    className="transition-colors duration-150 ease-out hover:bg-slate-50/90"
                  >
                    <TableCell className="py-1.5 px-2 font-medium leading-snug text-slate-900">
                      {label}
                    </TableCell>
                    <TableCell className="py-1.5 px-2 text-right tabular-nums leading-snug">
                      {row.row_count}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-center align-middle">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="inline-flex min-h-7 min-w-21 items-center justify-center border-accent-orange px-3 py-1.5 text-[11px] leading-tight text-accent-orange hover:bg-orange-50"
                        onClick={() => openDetail(ym)}
                      >
                        詳細
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDetail())}>
        <DialogContent className="max-h-[85vh] max-w-[min(100vw-1.5rem,56rem)] overflow-hidden flex flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-neutral-100 px-6 pb-4 pt-6">
            <DialogTitle>
              勤怠実績の詳細
              {selectedMonth
                ? `（${format(parseISO(selectedMonth.slice(0, 10)), 'yyyy年M月', { locale: ja })}）`
                : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-auto px-4 pb-6 pt-2 sm:px-6">
            {detailLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : detailError ? (
              <p className="text-sm text-red-600">{detailError}</p>
            ) : (
              <>
                {detailTruncated && (
                  <p className="mb-2 text-xs text-amber-800">
                    表示は最大 {DETAIL_LIMIT} 件です。それ以上ある場合は絞り込みを検討してください。
                  </p>
                )}
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">
                        年月日
                      </TableHead>
                      <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">氏名</TableHead>
                      <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">
                        開始時刻
                      </TableHead>
                      <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">
                        終了時刻
                      </TableHead>
                      <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">休み</TableHead>
                      <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">ソース</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRows.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={6} className="py-2 text-center text-slate-500">
                          データがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      detailRows.map((r, idx) => (
                        <TableRow
                          key={`${r.record_date}-${idx}`}
                          className="border-slate-100 transition-all duration-200 ease-out will-change-transform hover:z-1 hover:-translate-y-px hover:bg-orange-50/90 hover:shadow-md motion-reduce:transform-none motion-reduce:hover:shadow-none"
                        >
                          <TableCell className="whitespace-nowrap py-1.5 px-2 tabular-nums leading-snug">
                            {formatRecordDateYmd(r.record_date)}
                          </TableCell>
                          <TableCell className="py-1.5 px-2 leading-snug">{employeeNameFromRow(r)}</TableCell>
                          <TableCell className="whitespace-nowrap py-1.5 px-2 leading-snug">
                            {formatTimeInJSTFromIso(r.start_time) ?? '—'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-1.5 px-2 leading-snug">
                            {formatTimeInJSTFromIso(r.end_time) ?? '—'}
                          </TableCell>
                          <TableCell className="py-1.5 px-2 leading-snug">
                            {formatIsHolidayForDisplay(r.is_holiday)}
                          </TableCell>
                          <TableCell className="py-1.5 px-2 font-mono text-[11px] leading-snug">
                            {formatWorkTimeRecordSourceForDisplay(r.source)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
