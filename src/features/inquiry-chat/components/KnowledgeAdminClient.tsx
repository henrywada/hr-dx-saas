'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { TabsList, TabsTrigger } from '@/components/ui/Tabs'
import type { RagDocumentListItem } from '../queries'
import { deleteRagDocumentAction, ingestFileAction, ingestPasteAction, ingestUrlAction } from '../actions'
import { ragDocumentFormatLabel } from '../ragDocumentLabel'

type IngestTab = 'file' | 'paste' | 'url'

type PendingIngest = 'idle' | 'file' | 'paste' | 'url'

/** Server Action の応答が返らないまま接続が宙に浮くと UI が永遠に待つため、上限で打ち切る（actions の maxDuration 300s + 余裕） */
const INGEST_CLIENT_TIMEOUT_MS = 330_000

function raceWithIngestTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error('INGEST_CLIENT_TIMEOUT'))
    }, INGEST_CLIENT_TIMEOUT_MS)
    promise.then(
      (v) => {
        clearTimeout(id)
        resolve(v)
      },
      (e) => {
        clearTimeout(id)
        reject(e)
      }
    )
  })
}

function ingestTimeoutOrErrorMessage(e: unknown): string {
  if (e instanceof Error && e.message === 'INGEST_CLIENT_TIMEOUT') {
    return '取り込みが時間内に完了しませんでした。サーバーの実行時間上限・通信切断・または応答が返らない状態の可能性があります。ホスティングの関数ログを確認し、ページを再読み込みして一覧を確認してください。'
  }
  return e instanceof Error ? e.message : '取り込みに失敗しました'
}

function InlineSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 shrink-0 animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

type Props = {
  initialDocuments: RagDocumentListItem[]
}

export function KnowledgeAdminClient({ initialDocuments }: Props) {
  const router = useRouter()
  const [docs, setDocs] = useState(initialDocuments)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingIngest, setPendingIngest] = useState<PendingIngest>('idle')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const busy = pendingIngest !== 'idle' || deletingId !== null
  const [ingestTab, setIngestTab] = useState<IngestTab>('file')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  useEffect(() => {
    setDocs(initialDocuments)
  }, [initialDocuments])

  function refreshList() {
    router.refresh()
  }

  async function onPaste(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setPendingIngest('paste')
    setError(null)
    setMessage(null)
    const fd = new FormData(form)
    let res: Awaited<ReturnType<typeof ingestPasteAction>>
    try {
      res = await raceWithIngestTimeout(ingestPasteAction(fd))
    } catch (e) {
      setPendingIngest('idle')
      setError(ingestTimeoutOrErrorMessage(e))
      return
    }
    setPendingIngest('idle')
    if (!res.ok) {
      setError(res.error || '失敗しました')
      return
    }
    setMessage('登録しました')
    form.reset()
    refreshList()
  }

  async function onUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setPendingIngest('url')
    setError(null)
    setMessage(null)
    const fd = new FormData(form)
    let res: Awaited<ReturnType<typeof ingestUrlAction>>
    try {
      res = await raceWithIngestTimeout(ingestUrlAction(fd))
    } catch (e) {
      setPendingIngest('idle')
      setError(ingestTimeoutOrErrorMessage(e))
      return
    }
    setPendingIngest('idle')
    if (!res.ok) {
      setError(res.error || '失敗しました')
      return
    }
    setMessage('URL から取り込みました')
    form.reset()
    refreshList()
  }

  async function onFile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setPendingIngest('file')
    setError(null)
    setMessage(null)
    const fd = new FormData(form)
    let res: Awaited<ReturnType<typeof ingestFileAction>>
    try {
      res = await raceWithIngestTimeout(ingestFileAction(fd))
    } catch (e) {
      setPendingIngest('idle')
      setError(ingestTimeoutOrErrorMessage(e))
      return
    }
    setPendingIngest('idle')
    if (!res.ok) {
      setError(res.error || '失敗しました')
      return
    }
    setMessage('ファイルを取り込みました')
    form.reset()
    setSelectedFileName(null)
    refreshList()
  }

  async function onDelete(id: string) {
    if (!confirm('この文書とチャンクを削除しますか？')) return
    setDeletingId(id)
    setError(null)
    const res = await deleteRagDocumentAction(id)
    setDeletingId(null)
    if (!res.ok) {
      setError(res.error || '削除に失敗しました')
      return
    }
    setMessage('削除しました')
    refreshList()
  }

  return (
    <div className="space-y-10 max-w-4xl">
      <div className="rounded-lg border border-red-100 bg-red-50/60 p-4 text-sm text-red-950">
        社内規程・個人情報を含む文書の取り扱いに注意し、必要な範囲でのみ登録してください。
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div
        className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6', busy && 'relative')}
        aria-busy={busy}
      >
        {busy && (
          <div
            className="pointer-events-none absolute inset-0 z-[1] rounded-xl bg-white/40"
            aria-hidden
          />
        )}
        <TabsList className="relative z-[2] mb-4 w-full justify-start">
          <TabsTrigger
            selected={ingestTab === 'file'}
            disabled={busy}
            onClick={() => setIngestTab('file')}
          >
            ファイルアップロード
          </TabsTrigger>
          <TabsTrigger
            selected={ingestTab === 'paste'}
            disabled={busy}
            onClick={() => setIngestTab('paste')}
          >
            テキスト貼り付け
          </TabsTrigger>
          <TabsTrigger
            selected={ingestTab === 'url'}
            disabled={busy}
            onClick={() => setIngestTab('url')}
          >
            URL（公開ページ）
          </TabsTrigger>
        </TabsList>

        {ingestTab === 'file' && (
          <section className="relative z-[2] space-y-3" role="tabpanel" aria-label="ファイルアップロード">
            <h2 className="text-lg font-semibold text-slate-900">ファイル（PDF / DOCX / Excel / CSV）</h2>
            <form onSubmit={onFile} encType="multipart/form-data" className="space-y-2 grid gap-2">
              <input name="title" placeholder="タイトル（任意）" className="rounded border border-slate-300 px-3 py-2" disabled={busy} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:gap-x-3">
                <input
                  ref={fileInputRef}
                  name="file"
                  type="file"
                  required
                  disabled={busy}
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(ev) => setSelectedFileName(ev.target.files?.[0]?.name ?? null)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  ファイルを選択
                </Button>
                <span className="text-sm text-slate-600">
                  {selectedFileName ? (
                    <span className="font-medium text-slate-800">{selectedFileName}</span>
                  ) : (
                    <span className="text-slate-500">PDF / Office / CSV（50MB 以下）</span>
                  )}
                </span>
              </div>
              <Button type="submit" variant="primary" disabled={busy} className="inline-flex items-center justify-center gap-2">
                {pendingIngest === 'file' ? (
                  <>
                    <InlineSpinner className="text-white" />
                    取り込み中…
                  </>
                ) : (
                  'アップロードして取り込む'
                )}
              </Button>
            </form>
          </section>
        )}

        {ingestTab === 'paste' && (
          <section className="relative z-[2] space-y-3" role="tabpanel" aria-label="テキスト貼り付け">
            <h2 className="text-lg font-semibold text-slate-900">テキスト貼り付け</h2>
            <form onSubmit={onPaste} className="space-y-2 grid gap-2">
              <input
                name="title"
                placeholder="タイトル（任意）"
                className="rounded border border-slate-300 px-3 py-2"
                disabled={busy}
              />
              <textarea
                name="body"
                required
                placeholder="規程や制度の本文を貼り付け"
                className="min-h-[140px] rounded border border-slate-300 px-3 py-2"
                disabled={busy}
              />
              <Button type="submit" variant="primary" disabled={busy} className="inline-flex items-center justify-center gap-2">
                {pendingIngest === 'paste' ? (
                  <>
                    <InlineSpinner className="text-white" />
                    取り込み中…
                  </>
                ) : (
                  '取り込む'
                )}
              </Button>
            </form>
          </section>
        )}

        {ingestTab === 'url' && (
          <section className="relative z-[2] space-y-3" role="tabpanel" aria-label="URL（公開ページ）">
            <h2 className="text-lg font-semibold text-slate-900">URL（公開ページ）</h2>
            <form onSubmit={onUrl} className="space-y-2 grid gap-2">
              <input
                name="title"
                placeholder="表示名（任意）"
                className="rounded border border-slate-300 px-3 py-2"
                disabled={busy}
              />
              <input
                name="url"
                type="url"
                required
                placeholder="https://..."
                className="rounded border border-slate-300 px-3 py-2"
                disabled={busy}
              />
              <Button type="submit" variant="primary" disabled={busy} className="inline-flex items-center justify-center gap-2">
                {pendingIngest === 'url' ? (
                  <>
                    <InlineSpinner className="text-white" />
                    取り込み中…
                  </>
                ) : (
                  'URL から取り込む'
                )}
              </Button>
            </form>
          </section>
        )}
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">登録済み文書</h2>
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-2">タイトル</th>
                <th className="p-2">種別</th>
                <th className="p-2">区分</th>
                <th className="p-2">状態</th>
                <th className="p-2">登録日時</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-slate-500">
                    文書がありません
                  </td>
                </tr>
              ) : (
                docs.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="p-2 font-medium">{d.title}</td>
                    <td className="p-2 text-slate-600">{d.source_kind}</td>
                    <td className="p-2 text-slate-600">{ragDocumentFormatLabel(d)}</td>
                    <td className="p-2">{d.status}</td>
                    <td className="p-2 text-slate-500">{new Date(d.created_at).toLocaleString('ja-JP')}</td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="warning"
                        size="sm"
                        disabled={busy}
                        className="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5"
                        onClick={() => onDelete(d.id)}
                      >
                        {deletingId === d.id ? (
                          <>
                            <InlineSpinner className="text-white" />
                            削除中…
                          </>
                        ) : (
                          '削除'
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
