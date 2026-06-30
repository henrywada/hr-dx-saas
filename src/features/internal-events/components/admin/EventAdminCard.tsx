'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Division } from '@/features/organization/types'
import { updateEvent, deleteEvent } from '../../actions'
import type { InternalEvent, EventAttendee, EventAudienceType } from '../../types'
import { formatEventAudienceLabel } from '../../event-audience'
import { EventAttendeeTable } from './EventAttendeeTable'
import { EventAudienceFields } from './EventAudienceFields'

interface Props {
  event: InternalEvent
  attendees: EventAttendee[]
  divisions: Division[]
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EventAdminCard({ event, attendees, divisions }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [eventDate, setEventDate] = useState(toDatetimeLocalValue(event.event_date))
  const [location, setLocation] = useState(event.location ?? '')
  const [audienceType, setAudienceType] = useState<EventAudienceType>(event.audience_type)
  const [divisionId, setDivisionId] = useState(event.division_id ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    startTransition(async () => {
      try {
        await updateEvent({
          id: event.id,
          title,
          description: description || undefined,
          event_date: eventDate,
          location: location || undefined,
          audience_type: audienceType,
          division_id: audienceType === 'division' ? divisionId : null,
        })
        setIsEditing(false)
        router.refresh()
      } catch {
        setErrorMessage('更新に失敗しました。')
      }
    })
  }

  const handleDelete = () => {
    if (!window.confirm(`「${event.title}」を削除しますか？`)) return
    startTransition(async () => {
      try {
        await deleteEvent({ id: event.id })
        router.refresh()
      } catch {
        setErrorMessage('削除に失敗しました。')
      }
    })
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3">
          <EventAudienceFields
            audienceType={audienceType}
            divisionId={divisionId}
            divisions={divisions}
            onAudienceTypeChange={setAudienceType}
            onDivisionIdChange={setDivisionId}
            idPrefix={`edit-${event.id}`}
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">タイトル</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">開催日時</label>
            <input
              type="datetime-local"
              required
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">場所/オンラインURL</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">説明</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </div>
          {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
              <p className="text-xs text-slate-500">
                対象: {formatEventAudienceLabel(event)}
                {' ・ '}
                {new Date(event.event_date).toLocaleString('ja-JP')}
                {event.location ? ` ・ ${event.location}` : ''}
              </p>
              {event.description && (
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{event.description}</p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                編集
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                削除
              </button>
            </div>
          </div>
          {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
          <EventAttendeeTable attendees={attendees} />
        </>
      )}
    </div>
  )
}
