'use client'

import { useState, useTransition } from 'react'
import { updateRsvp } from '../actions'
import type { RsvpStatus } from '../types'

interface Props {
  eventId: string
  initialStatus: RsvpStatus
}

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'attending', label: '出席' },
  { value: 'declined', label: '欠席' },
  { value: 'pending', label: '未回答' },
]

export function EventRsvpButton({ eventId, initialStatus }: Props) {
  const [status, setStatus] = useState<RsvpStatus>(initialStatus)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSelect = (rsvpStatus: RsvpStatus) => {
    if (rsvpStatus === status) return
    setErrorMessage(null)
    startTransition(async () => {
      try {
        await updateRsvp({ eventId, rsvpStatus })
        setStatus(rsvpStatus)
      } catch {
        setErrorMessage('更新に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            disabled={isPending}
            onClick={() => handleSelect(option.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 ${
              status === option.value
                ? 'bg-[#FD7601] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {errorMessage && <p className="text-xs text-rose-600">{errorMessage}</p>}
    </div>
  )
}
