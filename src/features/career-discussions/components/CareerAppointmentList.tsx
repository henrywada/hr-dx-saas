'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { cancelCareerAppointment, completeCareerAppointment } from '../actions'
import type { CareerAppointmentRow } from '../types'

interface Props {
  appointments: CareerAppointmentRow[]
  manageable?: boolean
  emptyMessage?: string
}

function formatScheduledAt(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CareerAppointmentList({
  appointments,
  manageable = false,
  emptyMessage = '予定されている面談はありません。',
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (appointments.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 text-sm text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  function handleCancel(id: string) {
    if (!window.confirm('この予約をキャンセルしますか？')) return
    startTransition(async () => {
      await cancelCareerAppointment(id)
      router.refresh()
    })
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      await completeCareerAppointment(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {appointments.map(appt => (
        <div
          key={appt.id}
          className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-wrap items-start justify-between gap-3"
        >
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {formatScheduledAt(appt.scheduled_at)}
            </p>
            <p className="text-xs text-slate-600">
              対象: {appt.employee_name}
              {appt.department_name ? `（${appt.department_name}）` : ''}
            </p>
            <p className="text-xs text-slate-500">予約者: {appt.scheduled_by_name}</p>
            {appt.theme && (
              <p className="text-xs text-slate-700">
                <span className="font-medium">テーマ:</span> {appt.theme}
              </p>
            )}
            {appt.notes && <p className="text-xs text-slate-500">{appt.notes}</p>}
          </div>
          {manageable && (
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleComplete(appt.id)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FD7601] text-white disabled:opacity-50"
              >
                実施済み
              </button>
              <button
                type="button"
                onClick={() => handleCancel(appt.id)}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-600 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
