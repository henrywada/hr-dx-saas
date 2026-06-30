'use client'

import { useState, useTransition } from 'react'
import type { Division } from '@/features/organization/types'
import { createEvent } from '../../actions'
import type { EventAudienceType } from '../../types'
import { EventAudienceFields } from './EventAudienceFields'

interface Props {
  divisions: Division[]
}

export function EventFormDialog({ divisions }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [audienceType, setAudienceType] = useState<EventAudienceType>('tenant')
  const [divisionId, setDivisionId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setEventDate('')
    setLocation('')
    setAudienceType('tenant')
    setDivisionId('')
    setErrorMessage(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    startTransition(async () => {
      try {
        await createEvent({
          title,
          description: description || undefined,
          event_date: eventDate,
          location: location || undefined,
          audience_type: audienceType,
          division_id: audienceType === 'division' ? divisionId : null,
        })
        resetForm()
        setIsOpen(false)
      } catch {
        setErrorMessage('イベントの作成に失敗しました。')
      }
    })
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white hover:opacity-90 transition-opacity"
      >
        イベントを作成
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-sm font-bold text-slate-900">イベント作成</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <EventAudienceFields
            audienceType={audienceType}
            divisionId={divisionId}
            divisions={divisions}
            onAudienceTypeChange={setAudienceType}
            onDivisionIdChange={setDivisionId}
            idPrefix="create-event"
          />
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">タイトル</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 懇親会"
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
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsOpen(false)
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white disabled:opacity-50"
            >
              作成する
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
