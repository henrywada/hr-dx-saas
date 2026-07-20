'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ModeSelector } from './ModeSelector'
import { MessageBubble } from './MessageBubble'
import { QuestionTemplateChips } from './QuestionTemplateChips'
import { sendHrAssistantMessage, recordTemplateUsage } from '../actions'
import type { AssistantMode, HrAssistantMessage, Citation, QuestionTemplate } from '../types'
import { ASSISTANT_MODE_DESCRIPTIONS } from '../types'

type LocalMessage = HrAssistantMessage & { pendingCitations?: Citation[] }

type Props = {
  sessionId: string | null
  initialMessages: HrAssistantMessage[]
  initialMode: AssistantMode
  templates: QuestionTemplate[]
  onSessionCreated: (sessionId: string, mode: AssistantMode, title: string) => void
}

export function ChatPanel({
  sessionId,
  initialMessages,
  initialMode,
  templates,
  onSessionCreated,
}: Props) {
  const [mode, setMode] = useState<AssistantMode>(initialMode)
  const [messages, setMessages] = useState<LocalMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useRef<string | null>(sessionId)

  useEffect(() => {
    // sessionId が自分自身の送信で作成されたものと同じ場合（onSessionCreated 経由の親再レンダー）は、
    // 親が持つ古い initialMessages（作成前の空配列）で上書きしない。ローカル state が最新の会話を保持している。
    if (sessionId === currentSessionId.current) return

    setMessages(initialMessages)
    currentSessionId.current = sessionId
    setMode(initialMode)
    setError(null)
  }, [sessionId, initialMessages, initialMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const userMessage = text.trim()
    if (!userMessage || loading) return

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await sendMessage(input)
  }

  function handleTemplateSelect(template: QuestionTemplate) {
    void recordTemplateUsage(template.id)
    void sendMessage(template.question_text)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 py-3 border-b border-[#e2e6ec] bg-[#f6f8fa]/80">
        <ModeSelector value={mode} onChange={setMode} disabled={loading} />
        <p className="text-xs text-[#57606a] mt-1.5">{ASSISTANT_MODE_DESCRIPTIONS[mode]}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEmpty && !loading && (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-full max-w-xl space-y-5 text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#f6f8fa] flex items-center justify-center">
                  <span className="text-2xl" aria-hidden>
                    AI
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#24292f]">AI人事アシスタント</h3>
                <p className="text-sm text-[#57606a]">
                  最新の人事・労務情報を踏まえて質問に回答します。人事アップデートの内容も参照できます。
                </p>
              </div>
              <QuestionTemplateChips
                templates={templates}
                mode={mode}
                disabled={loading}
                onSelect={handleTemplateSelect}
              />
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 text-left">
                <p className="font-semibold mb-1">ご利用にあたって</p>
                <p>
                  回答は登録されたナレッジと公的情報に基づきます。最終的な判断は必ず人事責任者・社会保険労務士にご確認ください。
                </p>
              </div>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} citations={msg.pendingCitations} />
        ))}

        {loading && (
          <div className="flex gap-3 justify-start" aria-live="polite" aria-busy="true">
            <div className="w-8 h-8 rounded-full bg-[#FD7601] flex items-center justify-center shrink-0 animate-pulse">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-white border border-[#e2e6ec] rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm min-w-[140px]">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 items-center" aria-hidden>
                  <span className="w-2 h-2 rounded-full bg-[#FD7601] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-[#FD7601] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-[#FD7601] animate-bounce" />
                </div>
                <span className="text-xs text-[#57606a]">回答を作成中…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-[#e2e6ec] p-4 bg-white">
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        {!isEmpty && (
          <div className="mb-2">
            <QuestionTemplateChips
              templates={templates}
              mode={mode}
              disabled={loading}
              onSelect={handleTemplateSelect}
            />
          </div>
        )}
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
            className="flex-1 resize-none rounded-xl border border-[#e2e6ec] px-3 py-2 text-sm text-[#24292f] focus:ring-2 focus:ring-[#FD7601] focus:border-[#FD7601]"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !input.trim()}
            className="shrink-0 h-[72px] px-5"
            aria-label="実行"
          >
            ▶
          </Button>
        </form>
      </div>
    </div>
  )
}
