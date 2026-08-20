'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { deleteResearchHistory, fetchResearchDocument, runResearchSearch } from '../actions'
import { HistoryPanel } from './HistoryPanel'
import { ResultList } from './ResultList'
import { SourceDetailPanel } from './SourceDetailPanel'
import { SearchForm } from './SearchForm'
import { ModeRadioGroup } from './ModeRadioGroup'
import type {
  ResearchDocument,
  ResearchError,
  ResearchHistoryRow,
  ResearchHit,
  ResearchMode,
} from '../types'

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
  const [keyword, setKeyword] = useState('')
  const [hits, setHits] = useState<ResearchHit[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedHit, setSelectedHit] = useState<ResearchHit | null>(null)
  const [searchError, setSearchError] = useState<ResearchError | null>(null)
  const [pending, startTransition] = useTransition()
  const [history, setHistory] = useState(initialHistory)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 検索の世代カウンタ。モード切替後に、遅れて届いた前の検索結果で上書きしない。
  const searchRequestIdRef = useRef(0)

  const handleSearch = useCallback(
    (query: string) => {
      const q = query.trim()
      if (!q) return
      const requestId = ++searchRequestIdRef.current
      startTransition(async () => {
        setSearchError(null)
        setSelectedHit(null)
        setHasSearched(true)
        const result = await runResearchSearch({
          mode,
          keyword: q,
        })
        if (searchRequestIdRef.current !== requestId) return
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
    [mode]
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

  const handleModeChange = useCallback(
    (next: ResearchMode) => {
      if (next === mode) return
      setMode(next)
      syncModeToUrl(next)
      // 別ソースの結果が残らないよう、一覧と詳細を空に戻す
      setHits([])
      setHasSearched(false)
      setSelectedHit(null)
      setSearchError(null)
      setDoc(null)
      setDocError(null)
      setDocLoading(false)
      searchRequestIdRef.current += 1
      docRequestIdRef.current += 1
    },
    [mode, syncModeToUrl]
  )

  const handleBackToHistory = useCallback(() => {
    setHits([])
    setHasSearched(false)
    setSelectedHit(null)
    setSearchError(null)
    setDoc(null)
    setDocError(null)
    setDocLoading(false)
    searchRequestIdRef.current += 1
    docRequestIdRef.current += 1
  }, [])

  const handleDeleteHistory = useCallback((id: string) => {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteResearchHistory(id)
      setDeletingId(null)
      if (result.ok === true) {
        setHistory(rows => rows.filter(row => row.id !== id))
      }
    })
  }, [])

  // 履歴から再実行する。入力欄にも戻して、同じ聞き方で続けられるようにする
  const handlePickHistory = useCallback(
    (row: ResearchHistoryRow) => {
      setMode(row.mode)
      setKeyword(row.keyword)
      syncModeToUrl(row.mode)
      setSelectedHit(null)
      setDoc(null)
      setDocError(null)
      const requestId = ++searchRequestIdRef.current
      startTransition(async () => {
        setHasSearched(true)
        const result = await runResearchSearch({
          mode: row.mode,
          keyword: row.keyword,
        })
        if (searchRequestIdRef.current !== requestId) return
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
          条文番号や通達名は不要です。現場の業務で迷っていることを、そのまま質問文で入力してください。
        </p>
      </header>

      <ModeRadioGroup value={mode} onChange={handleModeChange} />

      <SearchForm
        mode={mode}
        keyword={keyword}
        pending={pending}
        onKeywordChange={setKeyword}
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
          <ResultList
            hits={hits}
            hasSearched={hasSearched}
            selectedId={selectedHit?.id ?? null}
            onSelect={handleSelect}
            onBackToHistory={handleBackToHistory}
          />
          <HistoryPanel
            rows={history}
            pendingId={deletingId}
            onPick={handlePickHistory}
            onDelete={handleDeleteHistory}
          />
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
