'use client'

import { useMemo, useState } from 'react'
import type { HrUpdateDocument } from '../types'
import { SourceUrlModal } from './SourceUrlModal'

type Props = {
  documents: HrUpdateDocument[]
  recentDocuments: HrUpdateDocument[]
}

type SubTab = 'news' | 'themes'

function isExpired(doc: HrUpdateDocument): boolean {
  if (doc.status === 'expired') return true
  if (!doc.expires_at) return false
  const today = new Date().toISOString().slice(0, 10)
  return doc.expires_at < today
}

function DocumentList({
  items,
  onOpenSource,
}: {
  items: HrUpdateDocument[]
  onOpenSource: (doc: HrUpdateDocument) => void
}) {
  if (items.length === 0) {
    return <p className="text-xs text-[#57606a] py-8 text-center">表示できる情報がありません</p>
  }

  return (
    <ul className="divide-y divide-[#e2e6ec] border border-[#e2e6ec] rounded-lg bg-white">
      {items.map(doc => (
        <li key={doc.id} className="px-4 py-3 hover:bg-[#f6f8fa]">
          <div className="flex flex-wrap items-baseline gap-2 text-sm">
            <span className="text-xs text-[#57606a] shrink-0 font-mono">
              {doc.fetched_at.slice(0, 10)}
            </span>
            <span className="font-medium text-[#24292f]">{doc.title}</span>
            {isExpired(doc) && (
              <span className="text-xs font-semibold text-red-600">終了しました</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-start gap-x-3 gap-y-1 text-xs text-[#57606a]">
            <p className="flex-1 min-w-0 leading-relaxed line-clamp-2">{doc.summary}</p>
            <button
              type="button"
              onClick={() => onOpenSource(doc)}
              className="shrink-0 text-[#FD7601] hover:underline font-medium"
            >
              詳細をみる
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** 人事アップデート: 最近のニュース / テーマ */
export function HrKnowledgePanel({ documents, recentDocuments }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('news')
  const [activeTheme, setActiveTheme] = useState<string | null>(null)
  const [modalDoc, setModalDoc] = useState<HrUpdateDocument | null>(null)

  const themes = useMemo(() => {
    const map = new Map<string, HrUpdateDocument[]>()
    for (const doc of documents) {
      const key = doc.theme?.trim() || 'その他'
      const list = map.get(key) ?? []
      list.push(doc)
      map.set(key, list)
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({
        name,
        items: [...items].sort(
          (a, b) =>
            new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime() ||
            a.title.localeCompare(b.title, 'ja')
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [documents])

  const currentTheme = activeTheme ?? themes[0]?.name ?? null
  const themeItems = themes.find(t => t.name === currentTheme)?.items ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 sm:px-6 py-3 border-b border-[#e2e6ec] bg-white flex gap-2">
        <button
          type="button"
          onClick={() => setSubTab('news')}
          className={`px-3 py-1.5 text-xs rounded-lg border ${
            subTab === 'news'
              ? 'border-[#FD7601] bg-[#FFF4EB] text-[#FD7601] font-semibold'
              : 'border-[#e2e6ec] text-[#57606a] hover:bg-[#f6f8fa]'
          }`}
        >
          最近のニュース
        </button>
        <button
          type="button"
          onClick={() => setSubTab('themes')}
          className={`px-3 py-1.5 text-xs rounded-lg border ${
            subTab === 'themes'
              ? 'border-[#FD7601] bg-[#FFF4EB] text-[#FD7601] font-semibold'
              : 'border-[#e2e6ec] text-[#57606a] hover:bg-[#f6f8fa]'
          }`}
        >
          テーマ別へ進む
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
        {subTab === 'news' ? (
          <DocumentList items={recentDocuments} onOpenSource={setModalDoc} />
        ) : (
          <div className="space-y-3">
            {themes.length === 0 ? (
              <p className="text-xs text-[#57606a] py-8 text-center">テーマ別の情報がありません</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {themes.map(t => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setActiveTheme(t.name)}
                      className={`px-2.5 py-1 text-xs rounded-lg border ${
                        currentTheme === t.name
                          ? 'border-[#FD7601] text-[#FD7601] bg-[#FFF4EB] font-semibold'
                          : 'border-[#e2e6ec] text-[#57606a] hover:bg-[#f6f8fa]'
                      }`}
                    >
                      {t.name}
                      <span className="ml-1 text-[#8b949e]">({t.items.length})</span>
                    </button>
                  ))}
                </div>
                <DocumentList items={themeItems} onOpenSource={setModalDoc} />
              </>
            )}
          </div>
        )}
      </div>

      <SourceUrlModal document={modalDoc} onClose={() => setModalDoc(null)} />
    </div>
  )
}
