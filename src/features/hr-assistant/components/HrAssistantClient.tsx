'use client'

import { useState } from 'react'
import { SessionHistory } from './SessionHistory'
import { ChatPanel } from './ChatPanel'
import type { HrAssistantSession, HrAssistantMessage, AssistantMode } from '../types'

type Props = {
  initialSessions: HrAssistantSession[]
  initialSessionId: string | null
  initialMessages: HrAssistantMessage[]
}

export function HrAssistantClient({ initialSessions, initialSessionId, initialMessages }: Props) {
  const [sessions, setSessions] = useState<HrAssistantSession[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId)
  const [activeMessages, setActiveMessages] = useState<HrAssistantMessage[]>(initialMessages)
  const [activeMode, setActiveMode] = useState<AssistantMode>('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  function handleSelectSession(session: HrAssistantSession) {
    // URL パラメータ変更で Server Component を再レンダリングしてメッセージを取得
    const url = new URL(window.location.href)
    url.searchParams.set('session', session.id)
    window.location.href = url.toString()
  }

  function handleNewSession() {
    setActiveSessionId(null)
    setActiveMessages([])
    setActiveMode('general')
    const url = new URL(window.location.href)
    url.searchParams.delete('session')
    window.history.pushState({}, '', url.toString())
  }

  function handleSessionCreated(sessionId: string, mode: AssistantMode, title: string) {
    const newSession: HrAssistantSession = {
      id: sessionId,
      title,
      mode,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setSessions(prev => [newSession, ...prev])
    setActiveSessionId(sessionId)

    const url = new URL(window.location.href)
    url.searchParams.set('session', sessionId)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* 左パネル：セッション履歴 */}
      <div
        className={`${
          isSidebarOpen ? 'w-72' : 'w-0'
        } shrink-0 border-r border-[#e2e6ec] bg-white overflow-hidden transition-all duration-200`}
      >
        <SessionHistory
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
        />
      </div>

      {/* 右パネル：チャット */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f6f8fa]">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e6ec] bg-white">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(v => !v)}
            className="p-2 rounded-lg hover:bg-[#f6f8fa] text-[#57606a] text-sm"
            aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <span className="text-sm font-semibold text-[#24292f]">AI 人事相談アシスタント</span>
        </div>
        <ChatPanel
          sessionId={activeSessionId}
          initialMessages={activeMessages}
          initialMode={activeMode}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    </div>
  )
}
