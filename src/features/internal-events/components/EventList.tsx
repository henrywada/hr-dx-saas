import { CalendarDays, MapPin } from 'lucide-react'
import { EventRsvpButton } from './EventRsvpButton'
import type { EventWithMyRsvp } from '../types'

interface Props {
  events: EventWithMyRsvp[]
}

function formatEventDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventList({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
        現在開催予定のイベントはありません。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map(event => (
        <div key={event.id} className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {formatEventDate(event.event_date)}
                </span>
                {event.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.location}
                  </span>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
              )}
            </div>
            <EventRsvpButton eventId={event.id} initialStatus={event.myRsvpStatus} />
          </div>
        </div>
      ))}
    </div>
  )
}
