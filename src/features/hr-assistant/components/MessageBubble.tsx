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
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
          <span className="text-white text-xs font-bold">AI</span>
        </div>
      )}
      <div className={cn('max-w-[80%] space-y-2', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
          )}
        >
          {message.content}
        </div>
        {!isUser && citations && citations.length > 0 && (
          <div className="ml-1">
            <p className="text-xs font-semibold text-slate-500 mb-1">参照資料</p>
            <ul className="space-y-1">
              {citations.map((c, i) => (
                <li key={i} className="text-xs text-slate-600">
                  <span className="font-medium text-slate-700">{c.title}</span>
                  <p className="text-slate-500 line-clamp-1 mt-0.5">{c.snippet}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className={cn('text-xs text-slate-400 px-1', isUser ? 'text-right' : 'text-left')}>
          {new Date(message.created_at).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
          <span className="text-slate-600 text-xs font-bold">HR</span>
        </div>
      )}
    </div>
  )
}
