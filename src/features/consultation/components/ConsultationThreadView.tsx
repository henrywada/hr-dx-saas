'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { replyToConsultation, updateConsultationStatus } from '../actions'
import { STATUS_LABEL } from '../labels'
import type { ConsultationThread, ConsultationStatus } from '../types'

interface ConsultationThreadViewProps {
  thread: ConsultationThread
  isStaff: boolean
}

export function ConsultationThreadView({ thread, isStaff }: ConsultationThreadViewProps) {
  const router = useRouter()
  const [replyBody, setReplyBody] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleReply = () => {
    startTransition(async () => {
      await replyToConsultation({ consultationId: thread.consultation.id, body: replyBody })
      setReplyBody('')
      router.refresh()
    })
  }

  const handleStatusChange = (status: ConsultationStatus) => {
    startTransition(async () => {
      await updateConsultationStatus({ consultationId: thread.consultation.id, status })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
        <span className="text-xs text-(--text-secondary)">
          状態: {STATUS_LABEL[thread.consultation.status]}
        </span>
        {isStaff && (
          <select
            value={thread.consultation.status}
            onChange={e => handleStatusChange(e.target.value as ConsultationStatus)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
          >
            <option value="open">未対応</option>
            <option value="in_progress">対応中</option>
            <option value="resolved">解決済み</option>
          </select>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs">{thread.consultation.body}</div>
        {thread.replies.map(reply => (
          <div
            key={reply.id}
            className={`rounded-lg border border-slate-200 p-4 text-xs ${
              reply.is_staff_reply ? 'bg-slate-50' : 'bg-white'
            }`}
          >
            {reply.body}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          maxLength={2000}
          rows={3}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={handleReply}
          disabled={isPending || replyBody.length === 0}
          className="self-end rounded-lg bg-(--brand) px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          返信する
        </button>
      </div>
    </div>
  )
}
