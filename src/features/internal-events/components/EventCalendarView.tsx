'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatEventAudienceLabel } from '../event-audience'
import type { EventWithMyRsvp } from '../types'

interface Props {
  events: EventWithMyRsvp[]
}

function toJstYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function parseMonthKey(ym: string): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number)
  return { year: y, month: m }
}

/** E-C1: 社内イベントの月次カレンダービュー */
export function EventCalendarView({ events }: Props) {
  const todayYmd = toJstYmd(new Date())
  const [monthKey, setMonthKey] = useState(todayYmd.slice(0, 7))

  const { year, month } = parseMonthKey(monthKey)
  const firstDay = new Date(`${monthKey}-01T00:00:00+09:00`)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventWithMyRsvp[]>()
    for (const event of events) {
      const ymd = toJstYmd(new Date(event.event_date))
      const list = map.get(ymd) ?? []
      list.push(event)
      map.set(ymd, list)
    }
    return map
  }, [events])

  const shiftMonth = (delta: number) => {
    const d = new Date(`${monthKey}-01T00:00:00+09:00`)
    d.setMonth(d.getMonth() + delta)
    setMonthKey(toJstYmd(d).slice(0, 7))
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < startWeekday; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="前月"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-slate-800">{year}年{month}月</h3>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="翌月"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-center text-slate-500 font-semibold">
        {['日', '月', '火', '水', '木', '金', '土'].map(w => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day == null) return <div key={`empty-${idx}`} className="min-h-[4.5rem]" />
          const ymd = `${monthKey}-${String(day).padStart(2, '0')}`
          const dayEvents = eventsByDate.get(ymd) ?? []
          const isToday = ymd === todayYmd
          return (
            <div
              key={ymd}
              className={`min-h-[4.5rem] rounded-md border p-1 ${isToday ? 'border-[#FD7601] bg-orange-50/40' : 'border-slate-100'}`}
            >
              <div className={`text-[10px] font-mono mb-0.5 ${isToday ? 'text-[#FD7601] font-bold' : 'text-slate-500'}`}>{day}</div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(ev => (
                  <div
                    key={ev.id}
                    className="text-[9px] leading-tight truncate bg-slate-100 rounded px-0.5 py-0.5 text-slate-700"
                    title={`${ev.title}（${formatEventAudienceLabel(ev)}）`}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-slate-400">+{dayEvents.length - 2}件</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
