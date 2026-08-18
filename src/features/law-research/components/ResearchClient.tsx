'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { ModeRadioGroup } from './ModeRadioGroup'
import type { ResearchHistoryRow, ResearchMode, ResearchSubTab } from '../types'

/** モードごとのサブタブ定義 */
export const SUB_TABS_BY_MODE: Record<ResearchMode, { value: ResearchSubTab; label: string }[]> = {
  tax: [
    { value: 'tax_article', label: '条文' },
    { value: 'tax_tsutatsu', label: '通達' },
    { value: 'tax_saiketsu', label: '裁決事例' },
  ],
  labor: [
    { value: 'labor_article', label: '条文' },
    { value: 'labor_mhlw', label: '厚労省通達' },
    { value: 'labor_jaish', label: '安衛通達' },
  ],
  law: [
    { value: 'law_search', label: '法令検索' },
    { value: 'law_article', label: '条文' },
    { value: 'law_revision', label: '改正履歴' },
  ],
}

export function ResearchClient({
  initialMode,
  initialHistory,
}: {
  initialMode: ResearchMode
  initialHistory: ResearchHistoryRow[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<ResearchMode>(initialMode)
  const [subTab, setSubTab] = useState<ResearchSubTab>(SUB_TABS_BY_MODE[initialMode][0].value)

  // モードは URL に持たせて共有・ブックマークできるようにする
  const handleModeChange = useCallback(
    (next: ResearchMode) => {
      setMode(next)
      setSubTab(SUB_TABS_BY_MODE[next][0].value)

      const params = new URLSearchParams(searchParams.toString())
      params.set('mode', next)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 mx-auto w-full max-w-[1920px] space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">調べる</h1>
        <p className="text-xs text-slate-500">
          法令・通達・裁決事例の原文を検索して確認します。AI は取得した原文の要約のみを行います。
        </p>
      </header>

      <ModeRadioGroup value={mode} onChange={handleModeChange} />

      <nav className="flex gap-1 border-b border-slate-200" aria-label="検索対象">
        {SUB_TABS_BY_MODE[mode].map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSubTab(tab.value)}
            className={`px-3 py-1.5 text-xs border-b-2 -mb-px transition-colors ${
              subTab === tab.value
                ? 'border-[#FD7601] text-[#FD7601] font-medium'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <p className="text-xs text-slate-400">
        現在の対象: {mode} / {subTab}（履歴 {initialHistory.length} 件）
      </p>

      <footer className="pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          本機能は参考情報です。最終的な判断は社会保険労務士・税理士等の専門家にご確認ください。
        </p>
      </footer>
    </div>
  )
}
