'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import type { OvertimeMonthRow } from '@/features/overtime/types'
import { shiftYearMonth } from '@/features/overtime/queries'
import { OvertimeApplicationForm } from './OvertimeApplicationForm'

/**
 * 行背景: 休暇（勤怠フラグ）を最優先、次に土曜（水色）・日曜（赤系）、平日はデフォルト
 */
function tableRowClass(isLeaveDay: boolean, workDateYmd: string): string {
  if (isLeaveDay) {
    return 'bg-violet-50/85 hover:bg-violet-100/75 border-b border-violet-100/80'
  }
  const [y, m, d] = workDateYmd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const w = dt.getDay()
  if (w === 0) {
    return 'bg-rose-50/70 hover:bg-rose-100/70 border-b border-rose-100/70'
  }
  if (w === 6) {
    return 'bg-sky-50/70 hover:bg-sky-100/70 border-b border-sky-100/70'
  }
  return 'border-b border-slate-100 hover:bg-slate-50/80'
}

function cell(v: string | null) {
  return v && v.trim() !== '' ? v : '-'
}

function formatTableDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  })
}

type Props = {
  yearMonth: string
  rows: OvertimeMonthRow[]
}

export function OvertimeMonthTable({ yearMonth, rows }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [modalWorkDate, setModalWorkDate] = useState<string | null>(null)

  const prevYm = shiftYearMonth(yearMonth, -1)
  const nextYm = shiftYearMonth(yearMonth, 1)
  const modalRow = modalWorkDate
    ? rows.find((r) => r.workDate === modalWorkDate)
    : undefined

  function openApply(workDate: string) {
    setModalWorkDate(workDate)
    setOpen(true)
  }

  function handleSuccess() {
    router.refresh()
    setOpen(false)
    setModalWorkDate(null)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/application?ym=${encodeURIComponent(prevYm)}`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
          >
            前月
          </Link>
          <span className="min-w-28 text-center text-lg font-semibold tabular-nums text-slate-900">
            {yearMonth}
          </span>
          <Link
            href={`/application?ym=${encodeURIComponent(nextYm)}`}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:bg-slate-50"
          >
            翌月
          </Link>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        土曜は水色・日曜は赤系の背景で表示します。休暇（勤怠の CSV「休日」列・
        <code className="rounded bg-slate-100 px-1">is_holiday</code>
        が「はい」）の日は紫系で優先し、休暇列に「有」と表示します。
      </p>

      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                日付
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                出勤時間
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                退勤時間
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                休暇
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                残業開始
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                残業終了
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                残業時間
              </th>
              <th className="min-w-[120px] px-2 py-2 text-xs font-medium sm:min-w-[140px] sm:px-3 sm:text-sm">
                残業理由
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                承認
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                申請
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
                <tr key={row.workDate} className={tableRowClass(row.isLeaveDay, row.workDate)}>
                  <td className="whitespace-nowrap px-2 py-1 text-xs tabular-nums text-slate-900 sm:px-3 sm:text-sm">
                    {formatTableDate(row.workDate)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs tabular-nums text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.clockInDisplay)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs tabular-nums text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.clockOutDisplay)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs text-slate-800 sm:px-3 sm:text-sm">
                    {row.isLeaveDay ? (
                      <span className="font-medium text-violet-900">有</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs tabular-nums text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.overtimeStartDisplay)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs tabular-nums text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.overtimeEndDisplay)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs tabular-nums text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.overtimeHoursDisplay)}
                  </td>
                  <td
                    className="max-w-[200px] truncate px-2 py-1 text-xs text-slate-700 sm:max-w-[220px] sm:px-3 sm:text-sm"
                    title={row.reasonDisplay ?? undefined}
                  >
                    {cell(row.reasonDisplay)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.statusDisplay)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 sm:px-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="!px-2 !py-1 text-xs"
                      disabled={row.statusDisplay === '承認済'}
                      onClick={() => openApply(row.workDate)}
                    >
                      申請
                    </Button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setModalWorkDate(null)
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto px-0 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>残業申請</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-2 sm:px-8 sm:pb-8">
            {modalWorkDate ? (
              <OvertimeApplicationForm
                key={modalWorkDate}
                initialWorkDate={modalWorkDate}
                initialOvertimeStartIso={modalRow?.overtimeStartIso}
                initialOvertimeEndIso={modalRow?.overtimeEndIso}
                initialReason={modalRow?.reasonRaw}
                onSuccess={handleSuccess}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
