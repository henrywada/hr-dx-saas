'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'

import { deleteDocumentAction, updateDocumentMetaAction } from '../actions'
import { runIngest } from '../ingest-runner'
import type { InfoBankDocumentRow } from '../queries'
import { draftToInput, MetaFields, type MetaDraft } from './MetaFields'
import { ingestRunnerActions, progressLabel, UploadPanel } from './UploadPanel'

const POLL_INTERVAL_MS = 5000

type Panel =
  | { kind: 'none' }
  | { kind: 'new' }
  | { kind: 'revision'; id: string }
  | { kind: 'edit'; id: string }

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '-'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  return `${Math.max(1, Math.round(bytes / 1024))}KB`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function statusView(doc: InfoBankDocumentRow): { label: string; className: string } {
  const revising = doc.isPublished && doc.hasPending
  if (doc.status === 'failed') {
    return {
      label: revising ? '改訂版の取り込みに失敗（旧版を公開中）' : '取り込み失敗',
      className: 'bg-red-50 text-red-700',
    }
  }
  if (doc.status === 'ready')
    return { label: '公開中', className: 'bg-emerald-50 text-emerald-700' }
  if (doc.status === 'processing') {
    return {
      label: revising ? '改訂版を取り込み中' : '取り込み中',
      className: 'bg-amber-50 text-amber-700',
    }
  }
  return {
    label: revising ? '改訂版の取り込み待ち' : '取り込み待ち',
    className: 'bg-slate-100 text-slate-700',
  }
}

function toDraft(doc: InfoBankDocumentRow): MetaDraft {
  return {
    title: doc.title,
    category: doc.category,
    tagsText: doc.tags.join(', '),
    keywordsText: doc.keywords.join(', '),
    summary: doc.summary,
  }
}

export function InfoBankAdminClient({ documents }: { documents: InfoBankDocumentRow[] }) {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel>({ kind: 'none' })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowStatus, setRowStatus] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<MetaDraft | null>(null)

  // 他の画面・タブで取り込み中の資料がある間は、一覧を定期的に更新する
  const hasProcessing = documents.some(d => d.status === 'processing')
  useEffect(() => {
    if (!hasProcessing || busyId) return
    const timer = setInterval(() => router.refresh(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [hasProcessing, busyId, router])

  function openPanel(next: Panel) {
    setMessage(null)
    setError(null)
    setPanel(next)
    const doc = next.kind === 'edit' ? documents.find(d => d.id === next.id) : undefined
    setDraft(doc ? toDraft(doc) : null)
  }

  async function retry(doc: InfoBankDocumentRow) {
    setBusyId(doc.id)
    setError(null)
    setMessage(null)
    try {
      const result = await runIngest(ingestRunnerActions, doc.id, p =>
        setRowStatus(progressLabel(p))
      )
      if (result.ok === false) setError(result.error)
      else setMessage(`「${doc.title}」の取り込みが完了しました`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '取り込みに失敗しました')
    } finally {
      setBusyId(null)
      setRowStatus(null)
      router.refresh()
    }
  }

  async function saveMeta(id: string) {
    if (!draft) return
    setBusyId(id)
    setError(null)
    const res = await updateDocumentMetaAction(id, draftToInput(draft))
    setBusyId(null)
    if (res.ok === false) return setError(res.error)
    setMessage('更新しました')
    setPanel({ kind: 'none' })
    router.refresh()
  }

  async function remove(doc: InfoBankDocumentRow) {
    if (
      !window.confirm(
        `「${doc.title}」を削除します。検索の対象からも外れ、元に戻せません。よろしいですか？`
      )
    ) {
      return
    }
    setBusyId(doc.id)
    setError(null)
    const res = await deleteDocumentAction(doc.id)
    setBusyId(null)
    if (res.ok === false) return setError(res.error)
    setMessage(`「${doc.title}」を削除しました`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          登録した資料だけが「社内AI情報バンク」の検索対象になります。改訂版は「改訂版」から入れ替えてください。
        </p>
        <Button
          onClick={() => openPanel(panel.kind === 'new' ? { kind: 'none' } : { kind: 'new' })}
        >
          {panel.kind === 'new' ? '閉じる' : '資料を追加'}
        </Button>
      </div>

      {message ? (
        <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {panel.kind === 'new' ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="mb-3 text-base font-semibold text-slate-900">資料を追加</h2>
          <UploadPanel
            mode={{ kind: 'new' }}
            onDone={() => {
              setMessage('資料を登録しました')
              setPanel({ kind: 'none' })
            }}
            onCancel={() => setPanel({ kind: 'none' })}
          />
        </section>
      ) : null}

      <section className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2 font-medium">資料</th>
              <th className="px-3 py-2 font-medium">カテゴリ / タグ</th>
              <th className="px-3 py-2 font-medium">版</th>
              <th className="px-3 py-2 font-medium">状態</th>
              <th className="px-3 py-2 font-medium">更新</th>
              <th className="px-3 py-2 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                  まだ資料がありません。「資料を追加」から登録してください。
                </td>
              </tr>
            ) : null}
            {documents.map(doc => {
              const st = statusView(doc)
              const isBusy = busyId === doc.id
              const needsRetry = doc.status !== 'ready' && doc.hasPending
              return (
                <React.Fragment key={doc.id}>
                  <tr className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{doc.title}</div>
                      <div className="text-xs text-slate-500">
                        {doc.filename ?? '-'}（{formatBytes(doc.byteSize)}）
                      </div>
                      {doc.status === 'failed' && doc.errorMessage ? (
                        <div className="mt-1 text-xs text-red-600">{doc.errorMessage}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-slate-700">{doc.category}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {doc.tags.map(t => (
                          <span
                            key={t}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-700">
                      {doc.revision > 0 ? `v${doc.revision}` : '-'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                      {isBusy && rowStatus ? (
                        <div className="mt-1 text-xs text-slate-500">{rowStatus}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-xs text-slate-500">
                      {formatDate(doc.updatedAt)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {needsRetry ? (
                          <Button size="sm" disabled={isBusy} onClick={() => retry(doc)}>
                            再実行
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy || doc.status === 'processing'}
                          onClick={() => openPanel({ kind: 'revision', id: doc.id })}
                        >
                          改訂版
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => openPanel({ kind: 'edit', id: doc.id })}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          variant="warning"
                          disabled={isBusy}
                          onClick={() => remove(doc)}
                        >
                          削除
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {panel.kind === 'revision' && panel.id === doc.id ? (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={6} className="px-3 py-4">
                        <UploadPanel
                          mode={{ kind: 'revision', documentId: doc.id, title: doc.title }}
                          onDone={() => {
                            setMessage(`「${doc.title}」を改訂版に入れ替えました`)
                            setPanel({ kind: 'none' })
                          }}
                          onCancel={() => setPanel({ kind: 'none' })}
                        />
                      </td>
                    </tr>
                  ) : null}
                  {panel.kind === 'edit' && panel.id === doc.id && draft ? (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={6} className="space-y-3 px-3 py-4">
                        <MetaFields value={draft} onChange={setDraft} disabled={isBusy} />
                        <div className="flex gap-2">
                          <Button disabled={isBusy} onClick={() => saveMeta(doc.id)}>
                            保存
                          </Button>
                          <Button
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => setPanel({ kind: 'none' })}
                          >
                            閉じる
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
