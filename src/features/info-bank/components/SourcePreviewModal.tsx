'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import { getSourceDownloadUrlAction } from '../actions'
import { locateExcerpts, normalizeForMatch } from '../locate-excerpts'
import { getSourcePreviewAction, type SourcePreview } from '../preview-action'

interface SourcePreviewModalProps {
  /** 表示する資料の ID。null のときは閉じる */
  documentId: string | null
  /** 回答の根拠になった抜粋。本文表示のときに該当箇所をハイライトする */
  excerpts?: readonly string[]
  onClose: () => void
}

/** 本文表示。根拠の抜粋があれば強調し、最初の箇所までスクロールする */
function ExtractedTextView({ text, excerpts }: { text: string; excerpts: readonly string[] }) {
  const firstMarkRef = useRef<HTMLElement | null>(null)
  const body = useMemo(() => normalizeForMatch(text), [text])
  const ranges = useMemo(() => locateExcerpts(body, excerpts), [body, excerpts])

  useEffect(() => {
    firstMarkRef.current?.scrollIntoView({ block: 'center' })
  }, [body, ranges])

  const segments = ranges.flatMap((r, i) => {
    const before = body.slice(i === 0 ? 0 : ranges[i - 1].end, r.start)
    return [
      <React.Fragment key={`t${i}`}>{before}</React.Fragment>,
      <mark
        key={`m${i}`}
        ref={i === 0 ? firstMarkRef : undefined}
        className="rounded-sm bg-yellow-200 px-0.5 text-slate-900"
      >
        {body.slice(r.start, r.end)}
      </mark>,
    ]
  })
  const tail = body.slice(ranges.length === 0 ? 0 : ranges[ranges.length - 1].end)

  return (
    <div className="flex h-full flex-col gap-2">
      <p className="text-xs text-slate-500">
        このファイル形式はそのまま表示できないため、AI が読み取った本文を表示しています。
        {ranges.length > 0 ? '回答の根拠にした箇所を黄色で示しています。' : ''}
      </p>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800">
        {segments}
        {tail}
      </pre>
    </div>
  )
}

type ViewState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'pdf'; preview: Extract<SourcePreview, { kind: 'pdf' }>; blobUrl: string }
  | { phase: 'text'; preview: Extract<SourcePreview, { kind: 'text' }> }

/** 出典の元ファイルをモーダルで表示する（PDF は埋め込み、その他は抽出した本文） */
export function SourcePreviewModal({
  documentId,
  excerpts = [],
  onClose,
}: SourcePreviewModalProps) {
  const [view, setView] = useState<ViewState>({ phase: 'loading' })
  // 抜粋は開いた時点の値を使う（回答の更新で再取得しないよう ref 経由で渡す）
  const excerptsRef = useRef<string[]>([])
  excerptsRef.current = [...excerpts]

  useEffect(() => {
    if (!documentId) return
    let cancelled = false
    let createdUrl: string | null = null
    setView({ phase: 'loading' })

    async function load(id: string) {
      try {
        const res = await getSourcePreviewAction(id, excerptsRef.current)
        if (cancelled) return
        if (res.ok === false) return setView({ phase: 'error', message: res.error })
        if (res.preview.kind === 'text') return setView({ phase: 'text', preview: res.preview })

        // Storage の配信ヘッダーだと iframe で PDF が描画されないため、Blob にして埋め込む
        const file = await fetch(res.preview.url)
        if (!file.ok) throw new Error('fetch failed')
        const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' })
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setView({ phase: 'pdf', preview: res.preview, blobUrl: createdUrl })
      } catch {
        if (!cancelled) setView({ phase: 'error', message: 'ファイルを表示できませんでした' })
      }
    }
    void load(documentId)

    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [documentId])

  async function download() {
    if (!documentId) return
    const res = await getSourceDownloadUrlAction(documentId)
    if (res.ok === false) setView({ phase: 'error', message: res.error })
    else window.open(res.url, '_blank', 'noopener,noreferrer')
  }

  const title = view.phase === 'pdf' || view.phase === 'text' ? view.preview.title : '元ファイル'
  const filename = view.phase === 'pdf' || view.phase === 'text' ? view.preview.filename : null

  return (
    <Dialog open={documentId !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="h-[85vh] max-w-[960px] rounded-lg">
        <DialogHeader className="rounded-t-lg px-5 pb-3 pt-5 sm:px-5 sm:pb-3 sm:pt-5">
          <DialogTitle>{title}</DialogTitle>
          {filename ? (
            <p className="text-xs text-slate-500">
              {filename}
              {view.phase === 'pdf' && view.preview.page
                ? `（回答の根拠: ${view.preview.page}ページ）`
                : ''}
            </p>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden px-5 py-3">
          {view.phase === 'loading' ? (
            <p className="py-10 text-center text-sm text-slate-500">読み込み中…</p>
          ) : view.phase === 'error' ? (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {view.message}
            </p>
          ) : view.phase === 'pdf' ? (
            <iframe
              src={view.preview.page ? `${view.blobUrl}#page=${view.preview.page}` : view.blobUrl}
              title={view.preview.title}
              className="h-full w-full rounded-lg border border-slate-200"
            />
          ) : (
            <ExtractedTextView text={view.preview.text} excerpts={excerpts} />
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button size="sm" variant="outline" onClick={download}>
            ダウンロード
          </Button>
          <Button size="sm" variant="secondary" onClick={onClose}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
