'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { deleteHrAssistantSession } from '../actions'
import type { HrAssistantSession, AssistantMode } from '../types'
import { ASSISTANT_MODE_LABELS } from '../types'

const MODE_BADGE_COLORS: Record<AssistantMode, string> = {
  general: 'bg-[#f6f8fa] text-[#57606a]',
  labor_calc: 'bg-amber-100 text-amber-700',
  comment_review: 'bg-violet-100 text-violet-700',
  case_search: 'bg-teal-100 text-teal-700',
}

type Props = {
  sessions: HrAssistantSession[]
  activeSessionId: string | null
  onSelectSession: (session: HrAssistantSession) => void
  onNewSession: () => void
}

export function SessionHistory({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
}: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, sessionId: string) {
    e.stopPropagation()
    if (!confirm('このセッションを削除しますか？')) return
    setDeleting(sessionId)
    await deleteHrAssistantSession(sessionId)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[#e2e6ec]">
        <button
          type="button"
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FD7601] text-white text-sm font-medium rounded-lg hover:bg-[#FD7601] transition-colors"
        >
          <span className="text-base leading-none">＋</span>
          新規相談を開始
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-[#57606a] text-center py-8">まだ相談履歴がありません</p>
        )}
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session)}
            className={cn(
              'group relative p-3 rounded-lg cursor-pointer transition-colors',
              activeSessionId === session.id
                ? 'bg-[#f6f8fa] border border-[#e2e6ec]'
                : 'hover:bg-[#f6f8fa] border border-transparent'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#24292f] truncate">
                  {session.title || '（タイトルなし）'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      MODE_BADGE_COLORS[session.mode as AssistantMode] ??
                        'bg-[#f6f8fa] text-[#57606a]'
                    )}
                  >
                    {ASSISTANT_MODE_LABELS[session.mode as AssistantMode] ?? session.mode}
                  </span>
                  <span className="text-xs text-[#57606a]">
                    {new Date(session.updated_at).toLocaleDateString('ja-JP', {
                      month: 'numeric',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={e => handleDelete(e, session.id)}
                disabled={deleting === session.id}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#57606a] hover:text-red-500 transition-opacity shrink-0"
                aria-label="削除"
              >
                {deleting === session.id ? '…' : '✕'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
