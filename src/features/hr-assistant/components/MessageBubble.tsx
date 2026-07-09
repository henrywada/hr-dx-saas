'use client'

import { cn } from '@/lib/utils'
import type { HrAssistantMessage, Citation } from '../types'

type Props = {
  message: HrAssistantMessage
  citations?: Citation[]
}

export function MessageBubble({ message, citations }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-[#FD7601] flex items-center justify-center shrink-0 mt-1">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div className={cn('max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-[#FD7601] text-white rounded-br-sm'
              : 'bg-white border border-[#e2e6ec] text-[#24292f] rounded-bl-sm shadow-sm'
          )}
        >
          {message.content}
        </div>
        {!isUser && citations && citations.length > 0 && (
          <div className="ml-1">
            <p className="text-xs font-semibold text-[#57606a] mb-1">参照資料</p>
            <ul className="space-y-1">
              {citations.map((c, i) => (
                <li key={i} className="text-xs text-[#57606a]">
                  {c.sourceUrl ? (
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-[#FD7601] hover:underline"
                    >
                      {c.title}
                    </a>
                  ) : (
                    <span className="font-medium text-[#24292f]">{c.title}</span>
                  )}
                  {c.fetchedAt && (
                    <span className="ml-1 text-[10px] text-[#57606a]">
                      （取得日: {c.fetchedAt}）
                    </span>
                  )}
                  <p className="text-[#57606a] line-clamp-1 mt-0.5">{c.snippet}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className={cn('text-xs text-[#57606a] px-1', isUser ? 'text-right' : 'text-left')}>
          {new Date(message.created_at).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-[#f6f8fa] flex items-center justify-center shrink-0 mt-1">
          <span className="text-[#57606a] text-xs font-bold">HR</span>
        </div>
      )}
    </div>
  )
}
