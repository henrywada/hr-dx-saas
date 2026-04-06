'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { format, parseISO, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { formatDateInJST, formatTimeInJSTFromIso } from '@/lib/datetime'
import { formatWorkTimeRecordSourceForDisplay } from '@/features/attendance/work-time-record-display'
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

/** ステータス列の並び（月次詳細と同様） */
const OA_STATUS_ORDER = ['申請中', '修正依頼', '承認済', '却下'] as const

function renderOvertimeStatuses(statuses: Set<string>): ReactNode {
  const arr = [...statuses].sort((a, b) => {
    const ia = OA_STATUS_ORDER.indexOf(a as (typeof OA_STATUS_ORDER)[number])
    const ib = OA_STATUS_ORDER.indexOf(b as (typeof OA_STATUS_ORDER)[number])
    if (ia !== -1 || ib !== -1) {
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    }
    return a.localeCompare(b, 'ja')
  })
  if (arr.length === 0) return null
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
      {arr.map((part, i) => (
        <span key={`${i}-${part}`} className="inline-flex items-center">
          {i > 0 ? (
            <span className="mx-0.5 text-neutral-300" aria-hidden>
              ・
            </span>
          ) : null}
          {part === '申請中' ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-amber-950 ring-1 ring-amber-300/90 shadow-sm">
              申請中
            </span>
          ) : part === '却下' ? (
            <span className="inline-flex items-center rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-semibold leading-tight text-pink-900 ring-1 ring-pink-300/90 shadow-sm">
              却下
            </span>
          ) : (
            <span className="text-neutral-800">{part}</span>
          )}
        </span>
      ))}
    </span>
  )
}

/** 0:00 はブランク */
function formatMinutesJpOrBlank(totalMinutes: number): string {
  if (totalMinutes === 0) return ''
  const h = Math.floor(totalMinutes / 60)
  const mm = totalMinutes % 60
  return `${h}:${String(mm).padStart(2, '0')}`
}

type DetailRow = {
  record_date: string
  start_time: string | null
  end_time: string | null
  source: string | null
  otApprovedMinutes: number
  otRejectedMinutes: number
  otPendingMinutes: number
  otStatusLine: ReactNode
  otApproverLine: string
}

type OaRowRaw = {
  work_date: string
  requested_hours: number
  status: string
  supervisor: { name: string | null } | { name: string | null }[] | null
}

function supervisorNameFromOa(oa: OaRowRaw): string | null {
  const s = oa.supervisor
  if (!s) return null
  const one = Array.isArray(s) ? s[0] : s
  const n = one?.name?.trim()
  return n || null
}

function aggregateOvertimeByDate(rows: OaRowRaw[]): Map<string, {
  approved: number
  rejected: number
  pending: number
  statuses: Set<string>
  approvers: Set<string>
}> {
  const map = new Map<
    string,
    {
      approved: number
      rejected: number
      pending: number
      statuses: Set<string>
      approvers: Set<string>
    }
  >()
  for (const oa of rows) {
    const wd = String(oa.work_date).slice(0, 10)
    let agg = map.get(wd)
    if (!agg) {
      agg = {
        approved: 0,
        rejected: 0,
        pending: 0,
        statuses: new Set(),
        approvers: new Set(),
      }
      map.set(wd, agg)
    }
    const hrs = Number(oa.requested_hours ?? 0)
    const m = Math.round(hrs * 60)
    agg.statuses.add(oa.status)
    if (oa.status === '承認済') {
      agg.approved += m
      const n = supervisorNameFromOa(oa)
      if (n) agg.approvers.add(n)
    } else if (oa.status === '却下') {
      agg.rejected += m
    } else if (oa.status === '申請中') {
      agg.pending += m
    }
  }
  return map
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
      const [wtrRes, oaRes] = await Promise.all([
        supabase
          .from('work_time_records')
          .select('record_date, start_time, end_time, source')
          .eq('employee_id', employeeId)
          .gte('record_date', start)
          .lte('record_date', end)
          .order('record_date', { ascending: true })
          .limit(DETAIL_LIMIT + 1),
        supabase
          .from('overtime_applications')
          .select(
            `
            work_date,
            requested_hours,
            status,
            supervisor:employees!overtime_applications_supervisor_id_fkey ( name )
          `,
          )
          .eq('employee_id', employeeId)
          .gte('work_date', start)
          .lte('work_date', end),
      ])

      if (wtrRes.error) {
        setDetailError(wtrRes.error.message)
        setDetailRows([])
        return
      }
      if (oaRes.error) {
        setDetailError(oaRes.error.message)
        setDetailRows([])
        return
      }

      const oaByDate = aggregateOvertimeByDate((oaRes.data ?? []) as OaRowRaw[])
      const raw = (wtrRes.data ?? []) as {
        record_date: string
        start_time: string | null
        end_time: string | null
        source: string | null
      }[]

      const enriched: DetailRow[] = raw.map((r) => {
        const wd = String(r.record_date).slice(0, 10)
        const o = oaByDate.get(wd)
        return {
          ...r,
          otApprovedMinutes: o?.approved ?? 0,
          otRejectedMinutes: o?.rejected ?? 0,
          otPendingMinutes: o?.pending ?? 0,
          otStatusLine: o && o.statuses.size > 0 ? renderOvertimeStatuses(o.statuses) : null,
          otApproverLine: o && o.approvers.size > 0 ? [...o.approvers].join('・') : '',
        }
      })

      if (enriched.length > DETAIL_LIMIT) {
        setDetailTruncated(true)
        setDetailRows(enriched.slice(0, DETAIL_LIMIT))
      } else {
        setDetailRows(enriched)
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
      <DialogContent className="flex max-h-[85vh] max-w-[min(100vw-1.5rem,72rem)] flex-col gap-0 overflow-hidden p-0">
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
              <Table className="min-w-[880px] text-xs">
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
                    <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight whitespace-nowrap">
                      残業（承認）
                    </TableHead>
                    <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight whitespace-nowrap">
                      残業（却下）
                    </TableHead>
                    <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight whitespace-nowrap">
                      残業（申請中）
                    </TableHead>
                    <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">ステータス</TableHead>
                    <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">承認者</TableHead>
                    <TableHead className="h-auto py-1.5 px-2 text-[11px] leading-tight">ソース</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailRows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={9} className="py-2 text-center text-slate-500">
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
                        <TableCell className="whitespace-nowrap py-1.5 px-2 font-mono tabular-nums leading-snug">
                          {formatMinutesJpOrBlank(r.otApprovedMinutes)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-1.5 px-2 font-mono tabular-nums leading-snug">
                          {formatMinutesJpOrBlank(r.otRejectedMinutes)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap py-1.5 px-2 font-mono tabular-nums leading-snug">
                          {formatMinutesJpOrBlank(r.otPendingMinutes)}
                        </TableCell>
                        <TableCell className="py-1.5 px-2 text-[11px] leading-snug">{r.otStatusLine}</TableCell>
                        <TableCell className="py-1.5 px-2 text-[11px] leading-snug">{r.otApproverLine}</TableCell>
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
