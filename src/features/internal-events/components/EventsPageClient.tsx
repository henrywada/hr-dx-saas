'use client'

import { useState } from 'react'
import { EventList } from './EventList'
import { EventCalendarView } from './EventCalendarView'
import { AwardBoard } from './AwardBoard'
import type { EventWithMyRsvp, Award } from '../types'

interface Props {
  events: EventWithMyRsvp[]
  awards: Award[]
}

/** E-C1: リスト / カレンダー切替付きイベント表示 */
export function EventsPageClient({ events, awards }: Props) {
  const [view, setView] = useState<'list' | 'calendar'>('list')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-slate-500">開催予定のイベント</h2>
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-[11px]">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-2.5 py-1 font-semibold ${view === 'list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
            >
              リスト
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`px-2.5 py-1 font-semibold ${view === 'calendar' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
            >
              カレンダー
            </button>
          </div>
        </div>
        {view === 'list' ? <EventList events={events} /> : <EventCalendarView events={events} />}
      </section>
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-slate-500">表彰発表</h2>
        <AwardBoard awards={awards} />
      </section>
    </div>
  )
}
