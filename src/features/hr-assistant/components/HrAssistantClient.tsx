'use client'

import { useState } from 'react'
import { SessionHistory } from './SessionHistory'
import { ChatPanel } from './ChatPanel'
import { HrKnowledgePanel } from './HrKnowledgePanel'
import TenantBackLink from '@/components/common/TenantBackLink'
import type {
  HrAssistantSession,
  HrAssistantMessage,
  AssistantMode,
  QuestionTemplate,
  HrUpdateDocument,
  HrAssistantMainTab,
} from '../types'

type Props = {
  initialSessions: HrAssistantSession[]
  initialSessionId: string | null
  initialMessages: HrAssistantMessage[]
  templates: QuestionTemplate[]
  updateDocuments: HrUpdateDocument[]
  recentUpdates: HrUpdateDocument[]
  initialTab?: HrAssistantMainTab
}

export function HrAssistantClient({
  initialSessions,
  initialSessionId,
  initialMessages,
  templates,
  updateDocuments,
  recentUpdates,
  initialTab = 'updates',
}: Props) {
  const [mainTab, setMainTab] = useState<HrAssistantMainTab>(initialTab)
  const [sessions, setSessions] = useState<HrAssistantSession[]>(initialSessions)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId)
  const [activeMessages, setActiveMessages] = useState<HrAssistantMessage[]>(initialMessages)
  const [activeMode, setActiveMode] = useState<AssistantMode>('general')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  function handleSelectSession(session: HrAssistantSession) {
    const url = new URL(window.location.href)
    url.searchParams.set('session', session.id)
    url.searchParams.set('tab', 'assistant')
    window.location.href = url.toString()
  }

  function handleNewSession() {
    setActiveSessionId(null)
    setActiveMessages([])
    setActiveMode('general')
    const url = new URL(window.location.href)
    url.searchParams.delete('session')
    url.searchParams.set('tab', 'assistant')
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
    url.searchParams.set('tab', 'assistant')
    window.history.replaceState({}, '', url.toString())
  }

  function switchTab(tab: HrAssistantMainTab) {
    setMainTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url.toString())
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e6ec] bg-white shrink-0">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => switchTab('updates')}
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              mainTab === 'updates'
                ? 'border-[#FD7601] bg-[#FFF4EB] text-[#FD7601] font-semibold'
                : 'border-transparent text-[#57606a] hover:bg-[#f6f8fa]'
            }`}
          >
            人事アップデート
          </button>
          <button
            type="button"
            onClick={() => switchTab('assistant')}
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              mainTab === 'assistant'
                ? 'border-[#FD7601] bg-[#FFF4EB] text-[#FD7601] font-semibold'
                : 'border-transparent text-[#57606a] hover:bg-[#f6f8fa]'
            }`}
          >
            AI人事アシスタント
          </button>
        </div>
        <div className="ml-auto">
          <TenantBackLink />
        </div>
      </div>

      {mainTab === 'updates' ? (
        <div className="flex-1 min-h-0 bg-[#f6f8fa]">
          <HrKnowledgePanel documents={updateDocuments} recentDocuments={recentUpdates} />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden">
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
              <span className="text-sm font-semibold text-[#24292f]">AI人事アシスタント</span>
            </div>
            <ChatPanel
              sessionId={activeSessionId}
              initialMessages={activeMessages}
              initialMode={activeMode}
              templates={templates}
              onSessionCreated={handleSessionCreated}
            />
          </div>
        </div>
      )}
    </div>
  )
}
