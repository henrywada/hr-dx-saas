'use client'

import { useState } from 'react'
import { LawSourceList } from './LawSourceList'
import { LawTopicProposalList } from './LawTopicProposalList'
import { LawDocumentTable } from './LawDocumentTable'
import { LawRefreshLogTable } from './LawRefreshLogTable'
import type { HrLawSource, HrLawDocument, HrLawRefreshLog, HrLawTopicProposal } from '../types'

type TabKey = 'sources' | 'proposals' | 'documents' | 'logs'

type Props = {
  sources: HrLawSource[]
  proposals: HrLawTopicProposal[]
  documents: HrLawDocument[]
  logs: HrLawRefreshLog[]
  pendingQueue: number
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'sources', label: '監視トピック' },
  { key: 'proposals', label: 'トピック候補' },
  { key: 'documents', label: '収集済み文書' },
  { key: 'logs', label: 'ログ' },
]

export function HrLawKnowledgeTabs({ sources, proposals, documents, logs, pendingQueue }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('sources')
  const pendingCount = proposals.filter(p => p.status === 'pending').length

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-480 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold">人事アップデート管理</h1>
          <p className="text-xs text-[#57606a] mt-1">
            厚労省等の公的情報を週次収集し、全テナントで共有します（OpenRouter）。
          </p>
        </div>
        <p className="text-xs text-[#57606a] shrink-0">
          キュー未処理: <span className="font-semibold text-[#24292f]">{pendingQueue}</span> 件
          {pendingCount > 0 && (
            <>
              {' · '}
              候補: <span className="font-semibold text-[#FD7601]">{pendingCount}</span> 件
            </>
          )}
        </p>
      </div>

      <div className="border-b border-[#e2e6ec]">
        <nav className="-mb-px flex gap-4" aria-label="人事アップデート管理タブ">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#FD7601] text-[#FD7601]'
                  : 'border-transparent text-[#57606a] hover:text-[#24292f] hover:border-[#e2e6ec]'
              }`}
            >
              {tab.label}
              {tab.key === 'proposals' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </nav>
      </div>

      <div className="pt-1">
        {activeTab === 'sources' && <LawSourceList sources={sources} />}
        {activeTab === 'proposals' && <LawTopicProposalList proposals={proposals} />}
        {activeTab === 'documents' && <LawDocumentTable documents={documents} />}
        {activeTab === 'logs' && <LawRefreshLogTable logs={logs} />}
      </div>
    </div>
  )
}
