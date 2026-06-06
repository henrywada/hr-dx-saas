'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ModeSelector } from './ModeSelector'
import { MessageBubble } from './MessageBubble'
import { sendHrAssistantMessage } from '../actions'
import type { AssistantMode, HrAssistantMessage, Citation } from '../types'
import { ASSISTANT_MODE_DESCRIPTIONS } from '../types'

type LocalMessage = HrAssistantMessage & { pendingCitations?: Citation[] }

type Props = {
  sessionId: string | null
  initialMessages: HrAssistantMessage[]
  initialMode: AssistantMode
  onSessionCreated: (sessionId: string, mode: AssistantMode, title: string) => void
}

export function ChatPanel({ sessionId, initialMessages, initialMode, onSessionCreated }: Props) {
  const [mode, setMode] = useState<AssistantMode>(initialMode)
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useRef<string | null>(sessionId)

  useEffect(() => {
    setMessages(initialMessages)
    currentSessionId.current = sessionId
    setMode(initialMode)
    setError(null)
  }, [sessionId, initialMessages, initialMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setError(null)

    const optimisticUser: LocalMessage = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: userMessage,
      mode,
      cited_chunk_ids: null,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticUser])

    const res = await sendHrAssistantMessage({
      sessionId: currentSessionId.current,
      message: userMessage,
      mode,
    })

    setLoading(false)

    if (res.ok === false) {
      setError(res.error)
      setMessages(prev => prev.filter(m => m.id !== optimisticUser.id))
      return
    }

    if (!currentSessionId.current) {
      currentSessionId.current = res.sessionId
      onSessionCreated(res.sessionId, mode, userMessage.slice(0, 80))
    }

    const assistantMessage: LocalMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: res.answer,
      mode,
      cited_chunk_ids: null,
      metadata: {},
      created_at: new Date().toISOString(),
      pendingCitations: res.citations,
    }
    setMessages(prev => [...prev, assistantMessage])
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/80">
        <ModeSelector value={mode} onChange={setMode} disabled={loading} />
        <p className="text-xs text-slate-500 mt-1.5">{ASSISTANT_MODE_DESCRIPTIONS[mode]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEmpty && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <h3 className="text-base font-semibold text-slate-700">AI 人事相談アシスタント</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              上のモードを選択して質問を入力してください。
              社内規程・労務計算・評価コメントなど、人事業務をサポートします。
            </p>
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 max-w-sm text-left">
              <p className="font-semibold mb-1">ご利用にあたって</p>
              <p>
                回答は登録されたナレッジ文書に基づきます。最終的な判断は必ず人事責任者・社会保険労務士にご確認ください。
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} citations={msg.pendingCitations} />
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-4 bg-white">
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="質問を入力…（Ctrl+Enter で送信）"
            rows={3}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !input.trim()}
            className="shrink-0 h-[72px] px-5"
          >
            送信
          </Button>
        </form>
      </div>
    </div>
  )
}
