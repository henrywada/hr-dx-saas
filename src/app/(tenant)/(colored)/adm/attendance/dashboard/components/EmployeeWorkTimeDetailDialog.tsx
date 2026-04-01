'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, parseISO, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { formatDateInJST, formatTimeInJSTFromIso } from '@/lib/datetime'
import {
  formatIsHolidayForDisplay,
  formatWorkTimeRecordSourceForDisplay,
} from '@/features/attendance/work-time-record-display'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const DETAIL_LIMIT = 2000

type DetailRow = {
  record_date: string
  start_time: string | null
  end_time: string | null
  is_holiday: boolean | null
  source: string | null
}

function formatRecordDateYmd(ymd: string): string {
  if (!ymd) return '—'
  try {
    return formatDateInJST(`${ymd}T12:00:00+09:00`)
  } catch {
    return ymd
  }
}

type EmployeeWorkTimeDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
  employeeId: string
  employeeName: string
}

/**
 * 人事ダッシュボード：選択月・1 従業員の work_time_records を日次一覧表示
 */
export function EmployeeWorkTimeDetailDialog({
  open,
  onOpenChange,
  year,
  month,
  employeeId,
  employeeName,
}: EmployeeWorkTimeDetailDialogProps) {
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailRows, setDetailRows] = useState<DetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTruncated, setDetailTruncated] = useState(false)

  const loadDetail = useCallback(async () => {
    if (!employeeId) {
      return
    }
    setDetailLoading(true)
    setDetailError(null)
    setDetailTruncated(false)
    try {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const end = format(endOfMonth(parseISO(start)), 'yyyy-MM-dd')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('work_time_records')
        .select('record_date, start_time, end_time, is_holiday, source')
        .eq('employee_id', employeeId)
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
  }, [year, month, employeeId])

  useEffect(() => {
    if (open && employeeId) {
      void loadDetail()
    }
  }, [open, employeeId, loadDetail])

  useEffect(() => {
    if (!open) {
      setDetailRows([])
      setDetailError(null)
      setDetailTruncated(false)
    }
  }, [open])

  const titleMonth = format(
    parseISO(`${year}-${String(month).padStart(2, '0')}-01`),
    'yyyy年M月',
    { locale: ja },
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-[min(100vw-1.5rem,56rem)] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-neutral-100 px-6 pb-4 pt-6">
          <DialogTitle>
            勤怠実績の詳細（{employeeName}・{titleMonth}）
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
                      <TableCell colSpan={5} className="py-2 text-center text-slate-500">
                        この月の勤怠実績データがありません
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
  )
}
