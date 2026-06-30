'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Bell, CalendarClock } from 'lucide-react'
import { cancelUpcomingOneOnOne, sendUpcomingOneOnOneReminder } from '../actions'
import type { UpcomingOneOnOneRow } from '../types'

interface Props {
  upcoming: UpcomingOneOnOneRow[]
}

export function UpcomingOneOnOnePanel({ upcoming }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  if (upcoming.length === 0) return null

  function handleReminder(id: string, employeeName: string) {
    setMessage(null)
    startTransition(async () => {
      const result = await sendUpcomingOneOnOneReminder(id)
      setMessage(
        result.success
          ? `${employeeName} へリマインドメールを送信しました`
          : (result.error ?? '送信に失敗しました'),
      )
      if (result.success) router.refresh()
    })
  }

  function handleCancel(id: string) {
    if (!confirm('この予定をキャンセルしますか？')) return
    startTransition(async () => {
      await cancelUpcomingOneOnOne(id)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-blue-700" />
        <h3 className="text-sm font-semibold text-blue-900">予定中の 1on1（アジェンダ共有）</h3>
      </div>
      {message && <p className="text-xs text-blue-800">{message}</p>}
      <ul className="space-y-2">
        {upcoming.map(row => (
          <li
            key={row.id}
            className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs flex flex-wrap items-start justify-between gap-2"
          >
            <div className="min-w-0 space-y-0.5">
              <div className="font-medium text-gray-900">
                {row.employee_name} — {row.theme}
              </div>
              <div className="text-gray-500">
                {format(new Date(row.scheduled_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
              </div>
              {row.agenda && (
                <p className="text-gray-600 line-clamp-2 whitespace-pre-wrap">{row.agenda}</p>
              )}
              {row.reminded_at && (
                <p className="text-[10px] text-gray-400">
                  最終リマインド: {format(new Date(row.reminded_at), 'MM/dd HH:mm', { locale: ja })}
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleReminder(row.id, row.employee_name)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <Bell className="w-3 h-3" />
                リマインド
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleCancel(row.id)}
                className="px-2 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
