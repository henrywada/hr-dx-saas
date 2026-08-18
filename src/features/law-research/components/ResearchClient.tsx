'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { fetchResearchDocument, runResearchSearch } from '../actions'
import { HistoryPanel } from './HistoryPanel'
import { ResultList } from './ResultList'
import { SourceDetailPanel } from './SourceDetailPanel'
import { PRIMARY_FIELD, SearchForm } from './SearchForm'
import { ModeRadioGroup } from './ModeRadioGroup'
import type {
  ResearchDocument,
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

  // 変数名は doc 系。DOM グローバルの document をシャドーイングしないため
  const [doc, setDoc] = useState<ResearchDocument | null>(null)
  const [docError, setDocError] = useState<ResearchError | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  // 詳細取得の世代カウンタ。行を素早く切り替えたとき、
  // 遅れて届いた古いレスポンスで新しい選択を上書きしないようにする。
  const docRequestIdRef = useRef(0)

  const handleSelect = useCallback((hit: ResearchHit) => {
    const requestId = ++docRequestIdRef.current
    setSelectedHit(hit)
    setDoc(null)
    setDocError(null)
    setDocLoading(true)

    fetchResearchDocument(hit.ref)
      .then(result => {
        // 自分より新しい取得が始まっていたら、この結果は捨てる
        if (docRequestIdRef.current !== requestId) return
        if (result.ok === true) setDoc(result.data)
        else setDocError(result.error)
      })
      .finally(() => {
        if (docRequestIdRef.current !== requestId) return
        setDocLoading(false)
      })
  }, [])

  // モードを URL に反映する。共有・ブックマークしたときに同じモードで開けるようにする。
  const syncModeToUrl = useCallback(
    (next: ResearchMode) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('mode', next)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  // モードは URL に持たせて共有・ブックマークできるようにする
  const handleModeChange = useCallback(
    (next: ResearchMode) => {
      setMode(next)
      setSubTab(SUB_TABS_BY_MODE[next][0].value)
      syncModeToUrl(next)
    },
    [syncModeToUrl]
  )

  // 履歴から再実行する。モードとサブタブも履歴の値へ戻す
  const handlePickHistory = useCallback(
    (row: ResearchHistoryRow) => {
      setMode(row.mode)
      setSubTab(row.sub_tab)
      syncModeToUrl(row.mode)
      setSelectedHit(null)
      startTransition(async () => {
        const result = await runResearchSearch({
          mode: row.mode,
          subTab: row.sub_tab,
          keyword: row.keyword,
        })
        if (result.ok === true) {
          setHits(result.data)
          setSearchError(null)
        } else {
          setHits([])
          setSearchError(result.error)
        }
      })
    },
    [syncModeToUrl]
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

      {/*
        key に入力欄のラベルを使うことで、入力欄の意味が変わったときだけ
        SearchForm を再マウントして入力値をリセットする。
        「厚労省通達」↔「安衛通達」はどちらも『キーワード』欄なので値が保持され、
        「法令名」→「キーワード」→「法令ID」のように意味が変わる切替ではリセットされる。
      */}
      <SearchForm
        key={PRIMARY_FIELD[subTab].label}
        subTab={subTab}
        pending={pending}
        onSubmit={handleSearch}
      />

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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="space-y-3">
          <ResultList hits={hits} selectedId={selectedHit?.id ?? null} onSelect={handleSelect} />
          <HistoryPanel rows={initialHistory} onPick={handlePickHistory} />
        </div>
        <SourceDetailPanel hit={selectedHit} doc={doc} loading={docLoading} error={docError} />
      </div>

      <footer className="pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          本機能は参考情報です。最終的な判断は社会保険労務士・税理士等の専門家にご確認ください。
        </p>
      </footer>
    </div>
  )
}
