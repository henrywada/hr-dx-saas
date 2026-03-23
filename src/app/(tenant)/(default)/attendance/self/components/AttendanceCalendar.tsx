'use client'

import type { WorkTimeRecordRow } from '@/features/attendance/types'
import { formatTimeInJSTFromIso } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { FileSpreadsheet, Monitor, QrCode } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function pickSourceIcon(source: string | null): LucideIcon | null {
  const s = (source ?? '').toLowerCase()
  if (s === 'qr') return QrCode
  if (s === 'csv') return FileSpreadsheet
  if (s === 'pc_log' || s === 'pc') return Monitor
  return null
}

function formatDurationShort(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

type Props = {
  year: number
  month: number
  recordsByDate: Map<string, WorkTimeRecordRow>
  /** JST 暦日 YYYY-MM-DD（triggered_at または alert_value 内の日付） */
  alertDates: Set<string>
  /** 月次残業が正のとき、勤務記録がある日のセルを薄オレンジにする（計画どおりの簡易ルール） */
  monthlyOvertimePositive: boolean
  selectedDate: string | null
  onSelectDate: (dateYmd: string) => void
}

export function AttendanceCalendar({
  year,
  month,
  recordsByDate,
  alertDates,
  monthlyOvertimePositive,
  selectedDate,
  onSelectDate,
}: Props) {
  const dim = new Date(year, month, 0).getDate()
  const leading = new Date(year, month - 1, 1).getDay()

  const cells: (number | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAYS_JA.map((w) => (
          <div
            key={w}
            className="text-center text-xs font-semibold text-slate-500 py-1"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`e-${idx}`}
                className="min-h-[5.5rem] rounded-xl bg-transparent"
              />
            )
          }

          const key = ymd(year, month, day)
          const rec = recordsByDate.get(key) ?? null
          const start = formatTimeInJSTFromIso(rec?.start_time ?? null)
          const end = formatTimeInJSTFromIso(rec?.end_time ?? null)
          const Icon = pickSourceIcon(rec?.source ?? null)

          const dow = new Date(year, month - 1, day).getDay()
          const isWeekend = dow === 0 || dow === 6
          const hasAlert = alertDates.has(key)
          const overtimeTint =
            monthlyOvertimePositive && rec != null && !isWeekend && !rec.is_holiday

          const selected = selectedDate === key

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={cn(
                'min-h-[5.5rem] rounded-xl border p-2 text-left transition-all outline-none',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isWeekend || rec?.is_holiday
                  ? 'bg-gray-100 border-slate-200/80'
                  : 'bg-white border-slate-200',
                overtimeTint && 'bg-orange-50 border-orange-100',
                selected && 'ring-2 ring-primary ring-offset-1',
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <span className="text-sm font-bold text-slate-900 tabular-nums">
                  {day}
                </span>
                <span className="flex items-center gap-0.5 shrink-0">
                  {Icon ? (
                    <Icon className="w-3.5 h-3.5 text-slate-500" aria-hidden />
                  ) : null}
                  {hasAlert ? (
                    <span
                      className="h-2 w-2 rounded-full bg-red-500 shrink-0"
                      title="アラートあり"
                      aria-label="アラートあり"
                    />
                  ) : null}
                </span>
              </div>
              {rec ? (
                <>
                  <p className="text-[10px] leading-tight text-slate-600 mt-1 tabular-nums line-clamp-2">
                    {start && end ? `${start} - ${end}` : start || end || '—'}
                  </p>
                  <p className="text-[10px] font-medium text-slate-700 mt-0.5">
                    {formatDurationShort(rec.duration_minutes)}
                  </p>
                </>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">—</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
