'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { sendInquiryMessage, type InquiryCitation } from '../actions'
import { cn } from '@/lib/utils'

type Variant = 'page' | 'modal'

type Props = {
  variant?: Variant
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: InquiryCitation[]
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FD7601]">
          <span className="text-[10px] font-bold text-white">AI</span>
        </div>
      )}
      <div className={cn('max-w-[85%] space-y-1.5', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-br-sm bg-[#FD7601] text-white'
              : 'rounded-bl-sm border border-[#e2e6ec] bg-white text-[#24292f] shadow-xs',
          )}
        >
          {message.content}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="ml-0.5">
            <p className="mb-1 text-xs font-semibold text-[#57606a]">参照した資料</p>
            <ul className="space-y-1">
              {message.citations.map((c, i) => (
                <li key={i} className="text-xs text-[#57606a]">
                  <span className="font-medium text-[#24292f]">{c.title}</span>
                  <p className="mt-0.5 line-clamp-2">{c.snippet}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isUser && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f6f8fa]">
          <span className="text-[10px] font-bold text-[#57606a]">私</span>
        </div>
      )}
    </div>
  )
}

export function InquiryChatPanel({ variant = 'page' }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useRef<string | null>(null)

  const isModal = variant === 'modal'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setError(null)

    const optimisticUser: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: userMessage,
    }
    setMessages(prev => [...prev, optimisticUser])

    const res = await sendInquiryMessage({
      sessionId: currentSessionId.current,
      message: userMessage,
    })

    setLoading(false)

    if (res.ok === false) {
      setError(res.error)
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id))
      return
    }

    if (!currentSessionId.current) {
      currentSessionId.current = res.sessionId
    }

    setMessages(prev => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
      },
    ])
  }

  function onNewSession() {
    currentSessionId.current = null
    setMessages([])
    setError(null)
    setInput('')
  }

  const isEmpty = messages.length === 0

  return (
    <div
      className={cn(
        'flex flex-col',
        !isModal && 'mx-auto max-w-3xl space-y-4',
        isModal && 'h-[min(440px,calc(80vh-240px))]',
      )}
    >
      <div
        className={cn(
          'shrink-0 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-950',
          isModal ? 'p-2.5 text-xs' : 'p-4 text-sm',
        )}
      >
        <p className="mb-0.5 font-semibold">社内情報の取り扱いについて</p>
        <p>
          回答は登録された制度文書に基づきます。内容の最終確認は人事担当までお問い合わせください。AI
          の解釈ミスがある場合があります。
        </p>
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#e2e6ec] bg-[#f6f8fa]/40',
          !isModal && 'min-h-[320px]',
        )}
      >
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {isEmpty && !loading && (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs">
                <span className="text-xl">💬</span>
              </div>
              <h3 className="text-sm font-semibold text-[#24292f]">人事制度について質問してください</h3>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[#57606a]">
                管理画面で登録された就業規則・社内規程などを参照して AI が回答します。
              </p>
              <p className="mt-3 text-xs text-[#57606a]">
                例：有給休暇の申請期限はいつまでですか？
              </p>
            </div>
          )}

          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {loading && (
            <div className="flex justify-start gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FD7601]">
                <span className="text-[10px] font-bold text-white">AI</span>
              </div>
              <div className="rounded-2xl rounded-bl-sm border border-[#e2e6ec] bg-white px-3.5 py-2.5 shadow-xs">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d0d7de] [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d0d7de] [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#d0d7de]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="shrink-0 border-t border-[#e2e6ec] bg-white p-3">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <textarea
              className={cn(
                'flex-1 resize-none rounded-lg border border-[#e2e6ec] px-2.5 py-2 text-sm text-[#24292f] focus:border-[#FD7601] focus:ring-2 focus:ring-[#FD7601]',
                isModal ? 'min-h-[72px]' : 'min-h-[88px]',
              )}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  onSubmit(e as unknown as React.FormEvent)
                }
              }}
              placeholder="質問を入力…（Ctrl+Enter で送信）"
              disabled={loading}
            />
            <div className="flex shrink-0 flex-col gap-1.5">
              <Button type="submit" variant="primary" size="sm" disabled={loading || !input.trim()}>
                {loading ? '生成中…' : '送信'}
              </Button>
              {messages.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={onNewSession} disabled={loading}>
                  新しい会話
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
