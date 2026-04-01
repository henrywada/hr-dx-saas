'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Info } from 'lucide-react'
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
  /** 月次締め（集計済〜締処理済）で申請列を出さない */
  monthClosureBlocksApplications?: boolean
}

export function OvertimeMonthTable({
  yearMonth,
  rows,
  monthClosureBlocksApplications = false,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [modalWorkDate, setModalWorkDate] = useState<string | null>(null)
  const [otDetailOpen, setOtDetailOpen] = useState(false)
  const [otDetail, setOtDetail] = useState<{
    reason: string
    comment: string
  } | null>(null)

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
        が「はい」）の日は紫系で優先し、休暇列に「●」と表示します。
      </p>

      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table
          className={`w-full text-left text-sm ${monthClosureBlocksApplications ? 'min-w-[1140px]' : 'min-w-[1260px]'}`}
        >
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
                ソース
              </th>
              <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                承認
              </th>
              {!monthClosureBlocksApplications ? (
                <th className="whitespace-nowrap px-2 py-2 text-xs font-medium sm:px-3 sm:text-sm">
                  申請
                </th>
              ) : null}
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
                      <span className="font-medium text-violet-900" aria-label="休暇">
                        ●
                      </span>
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
                  <td className="max-w-[240px] px-2 py-1 text-xs text-slate-700 sm:max-w-[260px] sm:px-3 sm:text-sm">
                    <div className="flex min-w-0 items-center gap-1">
                      <span
                        className="min-w-0 flex-1 truncate"
                        title={row.reasonDisplay?.trim() ? row.reasonDisplay : undefined}
                      >
                        {cell(row.reasonDisplay)}
                      </span>
                      {row.hasOvertimeApplication ? (
                        <button
                          type="button"
                          className="inline-flex shrink-0 rounded p-0.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          aria-label="残業理由・承認者コメントを表示"
                          onClick={() => {
                            setOtDetail({
                              reason: row.reasonRaw?.trim() ?? '',
                              comment: row.supervisorCommentRaw?.trim() ?? '',
                            })
                            setOtDetailOpen(true)
                          }}
                        >
                          <Info className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.sourceDisplay)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1 text-xs text-slate-800 sm:px-3 sm:text-sm">
                    {cell(row.statusDisplay)}
                  </td>
                  {!monthClosureBlocksApplications ? (
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
                  ) : null}
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

      <Dialog
        open={otDetailOpen}
        onOpenChange={(v) => {
          setOtDetailOpen(v)
          if (!v) setOtDetail(null)
        }}
      >
        <DialogContent className="max-w-md gap-0 p-0 sm:max-w-md">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>残業理由・承認者コメント</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6 pt-2">
            <div>
              <p className="text-xs font-semibold text-slate-500">残業理由</p>
              <p className="mt-1 min-h-5 whitespace-pre-wrap text-sm text-slate-800">
                {otDetail?.reason ?? ''}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">承認者コメント</p>
              <p className="mt-1 min-h-5 whitespace-pre-wrap text-sm text-slate-800">
                {otDetail?.comment ?? ''}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
