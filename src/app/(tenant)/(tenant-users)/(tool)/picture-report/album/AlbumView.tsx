// 写真レポートホルダー（アルバム画面）のClient Component
// scope/フィルタ変更・「もっと見る」はServer Action版の読み取りラッパー（fetchAlbumPage/fetchAlbumSubjectOptions）経由で再取得する
'use client'

import Link from 'next/link'
import { Images, LayoutGrid, List, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAlbumPage,
  fetchAlbumSubjectOptions,
  updateSendBody,
  deleteSend,
} from '@/features/picture-report/actions'
import { picturePriorityLabel } from '@/lib/picture-report/priority'
import { APP_ROUTES } from '@/config/routes'
import type { AlbumItem, AlbumScope } from '@/features/picture-report/types'

const ALL_SUBJECTS = ''
const VIEW_MODE_STORAGE_KEY = 'hr-dx.picture-report.album.view-mode'

type ViewMode = 'thumbnail' | 'list'

type AlbumViewProps = {
  isManager: boolean
  initialOwnItems: AlbumItem[]
  initialOwnHasMore: boolean
  initialOwnSubjectOptions: string[]
  pageSize: number
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function readStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'thumbnail'
  return window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'thumbnail'
}

function isHighPriority(priority: unknown): boolean {
  return priority === 'high'
}

function HighPriorityBadge({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'px-1 py-px text-[10px]' : 'px-1.5 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center rounded font-bold text-white bg-red-500 ${sizeClass}`}
    >
      高
    </span>
  )
}

export function AlbumView({
  isManager,
  initialOwnItems,
  initialOwnHasMore,
  initialOwnSubjectOptions,
  pageSize,
}: AlbumViewProps) {
  const [scope, setScope] = useState<AlbumScope>('own')
  const [items, setItems] = useState<AlbumItem[]>(initialOwnItems)
  const [subjectFilter, setSubjectFilter] = useState(ALL_SUBJECTS)
  const [highOnly, setHighOnly] = useState(false)
  const [subjectOptions, setSubjectOptions] = useState<string[]>(initialOwnSubjectOptions)
  const [viewMode, setViewMode] = useState<ViewMode>('thumbnail')
  const [viewModeReady, setViewModeReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialOwnHasMore)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [bodyDraft, setBodyDraft] = useState('')
  const [savingBody, setSavingBody] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailMessage, setDetailMessage] = useState<string | null>(null)

  const selected = useMemo(
    () => items.find(item => item.id === selectedId) ?? null,
    [items, selectedId]
  )
  const canEditSelected = scope === 'own'

  const loadPage = useCallback(
    async (targetScope: AlbumScope, offset: number, append: boolean) => {
      if (append) setLoadingMore(true)
      else {
        setLoading(true)
        setError(null)
      }

      try {
        const result = await fetchAlbumPage({
          scope: targetScope,
          offset,
          limit: pageSize,
          subjectFilter: subjectFilter || undefined,
          highOnly,
        })

        setItems(prev => (append ? [...prev, ...result.items] : result.items))
        setHasMore(result.hasMore)
      } catch {
        setError('データの取得に失敗しました。')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [pageSize, subjectFilter, highOnly]
  )

  useEffect(() => {
    // マウント時にlocalStorage（外部システム）から表示モードを読み込む。
    // SSR時点ではlocalStorageにアクセスできないため、これ自体がeffectの正しい用途
    // （react-hooks/set-state-in-effectはカスケードレンダーの警告だが、初回マウント時
    // のみ実行される外部システム同期のため許容する）
    setViewMode(readStoredViewMode())
    setViewModeReady(true)
  }, [])

  useEffect(() => {
    if (!viewModeReady) return
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode)
  }, [viewMode, viewModeReady])

  // scope/subjectFilter/highOnly のいずれかが変わったら再取得する
  // （初回マウント時は Server Component から渡された initialOwnItems を使うためスキップする）
  // ※ useRef はミュータブルな値を保持するために設計されたHookのため、react-hooks/immutability
  //   （useMemoで作った疑似refを直接書き換えると発火するReact Compilerのlintルール）を回避できる
  const isFirstRenderRef = useRef(true)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return
    }
    // loadPage内部（非同期関数の先頭、await前）でsetLoading等を呼ぶため
    // react-hooks/set-state-in-effectが発火するが、scope/フィルタ変更時の
    // データ再取得というeffectの正しい用途であるため許容する
    void loadPage(scope, 0, false)
  }, [scope, subjectFilter, highOnly, loadPage])

  useEffect(() => {
    void fetchAlbumSubjectOptions(scope).then(setSubjectOptions)
  }, [scope])

  // selectedId が変わった（＝別の投稿を開いた）タイミングでのみ本文ドラフト等を同期する。
  // useEffect + setState はカスケードレンダーを招く（react-hooks/set-state-in-effect）ため、
  // SubjectManageModal.tsx と同様にReact推奨の「レンダー中に変化を検知してstateを調整する」
  // パターンを使う（https://react.dev/learn/you-might-not-need-an-effect）。
  // これにより items 更新時（本文保存直後の再レンダー等）に selected の参照だけが変わっても
  // 誤って detailMessage 等をリセットしない副次効果もある。
  const [syncedSelectedId, setSyncedSelectedId] = useState<string | null>(null)
  if (selectedId !== syncedSelectedId) {
    setSyncedSelectedId(selectedId)
    if (selected) {
      setBodyDraft(selected.body_text)
      setDetailError(null)
      setDetailMessage(null)
    }
  }

  function openDetail(item: AlbumItem) {
    setSelectedId(item.id)
    setBodyDraft(item.body_text)
    setDetailError(null)
    setDetailMessage(null)
  }

  function closeDetail() {
    setSelectedId(null)
    setDetailError(null)
    setDetailMessage(null)
  }

  async function handleSaveBody() {
    if (!selected) return
    setSavingBody(true)
    setDetailError(null)
    setDetailMessage(null)

    try {
      const result = await updateSendBody({ id: selected.id, bodyText: bodyDraft })

      // 注: tsconfig.json が strict: false（strictNullChecks 無効）のため
      // `!result.success` による否定narrowingは正しく機能しない。明示的な比較で判定する。
      if (result.success === false) {
        setDetailError(result.error)
        return
      }

      setItems(prev =>
        prev.map(item => (item.id === selected.id ? { ...item, body_text: bodyDraft } : item))
      )
      setDetailMessage('本文を保存しました。')
    } catch {
      setDetailError('予期しないエラーが発生しました。')
    } finally {
      setSavingBody(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    const ok = window.confirm('この写真を削除しますか？元に戻せません。')
    if (!ok) return

    setDeleting(true)
    setDetailError(null)
    setDetailMessage(null)

    try {
      const result = await deleteSend({ id: selected.id })

      // 注: strict: false 環境では `!result.success` の否定narrowingが効かないため明示比較にする
      if (result.success === false) {
        setDetailError(result.error)
        return
      }

      setItems(prev => prev.filter(item => item.id !== selected.id))
      closeDetail()
      void fetchAlbumSubjectOptions(scope).then(setSubjectOptions)
    } catch {
      setDetailError('予期しないエラーが発生しました。')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" strokeWidth={1.75} />
          <h1 className="text-lg font-semibold text-gray-900">写真レポートホルダー</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={APP_ROUTES.TENANT.TOOL_PICTURE_REPORT}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            写真レポート作成
          </Link>
          <Link
            href={APP_ROUTES.TENANT.PORTAL}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            ←戻る
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-500">
        送信した写真を一覧表示します。タップで詳細・本文編集・削除ができます。
      </p>

      {isManager && (
        <div
          className="mt-4 inline-flex self-start rounded-md border border-gray-200 bg-white p-0.5"
          role="radiogroup"
          aria-label="表示対象切替"
        >
          <button
            type="button"
            role="radio"
            aria-checked={scope === 'own'}
            onClick={() => setScope('own')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              scope === 'own'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            自分の投稿
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={scope === 'team'}
            onClick={() => setScope('team')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              scope === 'team'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            <Users className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            部下の投稿
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-3">
            <span className="font-medium text-gray-900">件名</span>
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:max-w-xs"
            >
              <option value={ALL_SUBJECTS}>すべて</option>
              {subjectOptions.map(subject => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex cursor-pointer items-center gap-1.5 self-start text-sm text-gray-900">
            <input
              type="checkbox"
              checked={highOnly}
              onChange={e => setHighOnly(e.target.checked)}
              className="accent-red-500"
            />
            高のみ表示
          </label>
        </div>

        <div
          className="inline-flex self-start rounded-md border border-gray-200 bg-white p-0.5"
          role="radiogroup"
          aria-label="表示切替"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'thumbnail'}
            onClick={() => setViewMode('thumbnail')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              viewMode === 'thumbnail'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            サムネイル
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'text-gray-500 hover:bg-orange-50 hover:text-gray-900'
            }`}
          >
            <List className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            リスト
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {loading && <p className="mt-8 text-sm text-gray-500">読み込み中...</p>}

      {!loading && items.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">
          {highOnly ? '優先度「高」の写真はありません。' : 'まだ写真がありません。'}
        </p>
      )}

      {!loading && items.length > 0 && viewMode === 'thumbnail' && (
        <ul className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
          {items.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openDetail(item)}
                className="group flex w-full flex-col overflow-hidden rounded-md border border-gray-200 bg-white text-left transition hover:border-primary/50"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                      画像なし
                    </div>
                  )}
                  {isHighPriority(item.priority) && (
                    <span className="absolute left-1 top-1">
                      <HighPriorityBadge size="sm" />
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 p-1.5 sm:p-2">
                  <p className="truncate text-[11px] font-medium text-gray-900 sm:text-xs">
                    {item.subject_text}
                  </p>
                  {!isHighPriority(item.priority) && (
                    <p className="truncate text-[10px] text-gray-500">
                      優先度：{picturePriorityLabel(item.priority)}
                    </p>
                  )}
                  <p className="truncate text-[10px] text-gray-500">
                    {formatTimestamp(item.created_at)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && items.length > 0 && viewMode === 'list' && (
        <ul className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-md border border-gray-200 bg-white">
          {items.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openDetail(item)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-orange-50/40"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                      画像なし
                    </div>
                  )}
                  {isHighPriority(item.priority) && (
                    <span className="absolute left-0.5 top-0.5">
                      <HighPriorityBadge size="sm" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900">
                    <span className="truncate">{item.subject_text}</span>
                    {isHighPriority(item.priority) && <HighPriorityBadge />}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {!isHighPriority(item.priority) && (
                      <>優先度：{picturePriorityLabel(item.priority)}　</>
                    )}
                    {formatTimestamp(item.created_at)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadPage(scope, items.length, true)}
            className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
          >
            {loadingMore ? '読み込み中...' : 'もっと見る'}
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="album-detail-title"
          onClick={closeDetail}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="album-detail-title"
                className="flex min-w-0 items-center gap-2 text-base font-semibold text-gray-900"
              >
                <span className="truncate">{selected.subject_text}</span>
                {isHighPriority(selected.priority) && <HighPriorityBadge />}
              </h2>
              <button
                type="button"
                onClick={closeDetail}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                閉じる
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {!isHighPriority(selected.priority) && (
                <>優先度：{picturePriorityLabel(selected.priority)}　</>
              )}
              {formatTimestamp(selected.created_at)}
            </p>

            <div className="mt-3 overflow-hidden rounded-md border border-gray-200 bg-black">
              {selected.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.thumbnailUrl}
                  alt={selected.subject_text}
                  className="max-h-[50vh] w-full object-contain"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-white/80">
                  画像を表示できません
                </div>
              )}
            </div>

            <label className="mt-4 block space-y-1.5">
              <span className="text-sm font-medium text-gray-900">本文</span>
              <textarea
                value={bodyDraft}
                onChange={e => setBodyDraft(e.target.value)}
                rows={4}
                disabled={!canEditSelected || savingBody || deleting}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </label>

            {detailMessage && (
              <p className="mt-2 rounded-md bg-orange-50 px-3 py-2 text-sm text-primary">
                {detailMessage}
              </p>
            )}
            {detailError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {detailError}
              </p>
            )}

            {canEditSelected && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveBody()}
                  disabled={savingBody || deleting || bodyDraft === selected.body_text}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingBody ? '保存中...' : '本文を保存'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={savingBody || deleting}
                  className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              </div>
            )}
            {!canEditSelected && (
              <p className="mt-4 text-xs text-gray-500">
                部下の投稿は閲覧のみです（編集・削除はできません）。
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
