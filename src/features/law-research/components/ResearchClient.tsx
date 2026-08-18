'use client'

import { useCallback, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { runResearchSearch } from '../actions'
import { ResultList } from './ResultList'
import { SearchForm } from './SearchForm'
import { ModeRadioGroup } from './ModeRadioGroup'
import type {
  ResearchError,
  ResearchHistoryRow,
  ResearchHit,
  ResearchMode,
  ResearchSubTab,
} from '../types'

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

  const [hits, setHits] = useState<ResearchHit[]>([])
  const [selectedHit, setSelectedHit] = useState<ResearchHit | null>(null)
  const [searchError, setSearchError] = useState<ResearchError | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSearch = useCallback(
    (input: { keyword: string; article?: string }) => {
      startTransition(async () => {
        setSearchError(null)
        setSelectedHit(null)
        const result = await runResearchSearch({
          mode,
          subTab,
          keyword: input.keyword,
          article: input.article,
        })
        // strict: false（strictNullChecks 無効）環境では `if (result.ok)` の else 節で
        // result.error への絞り込みが効かないため、明示的に === true で判定する
        if (result.ok === true) {
          setHits(result.data)
        } else {
          setHits([])
          setSearchError(result.error)
        }
      })
    },
    [mode, subTab]
  )

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

      <SearchForm subTab={subTab} pending={pending} onSubmit={handleSearch} />

      {searchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">{searchError.message}</p>
          {searchError.sourceUrl && (
            <a
              href={searchError.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-red-700 underline mt-1 inline-block"
            >
              出典サイトを直接開く
            </a>
          )}
        </div>
      )}

      <ResultList hits={hits} selectedId={selectedHit?.id ?? null} onSelect={setSelectedHit} />

      <footer className="pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          本機能は参考情報です。最終的な判断は社会保険労務士・税理士等の専門家にご確認ください。
        </p>
      </footer>
    </div>
  )
}
