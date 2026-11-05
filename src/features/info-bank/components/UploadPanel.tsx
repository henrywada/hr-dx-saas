'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/Button'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

import {
  createUploadUrlAction,
  getIngestProgressAction,
  ingestEmbedBatchAction,
  ingestExtractAction,
  registerDocumentAction,
  registerRevisionAction,
} from '../actions'
import { INFO_BANK_BUCKET } from '../constants'
import { validateUpload } from '../file-policy'
import { runIngest, type IngestProgressEvent, type IngestRunnerActions } from '../ingest-runner'
import { draftToInput, EMPTY_META_DRAFT, MetaFields, type MetaDraft } from './MetaFields'

/** 画面から取り込みを進めるときに使う Server Action の組 */
export const ingestRunnerActions: IngestRunnerActions = {
  getProgress: getIngestProgressAction,
  extract: ingestExtractAction,
  embedBatch: ingestEmbedBatchAction,
}

export function progressLabel(p: IngestProgressEvent): string {
  if (p.phase === 'extracting') return '本文を読み取っています…'
  if (p.phase === 'embedding') return `検索用に変換しています…（残り ${p.remaining ?? 0} 件）`
  return '完了しました'
}

export type UploadMode = { kind: 'new' } | { kind: 'revision'; documentId: string; title: string }

interface Props {
  mode: UploadMode
  onDone: () => void
  onCancel?: () => void
}

const ACCEPT = '.pdf,.docx,.xlsx,.xls,.csv,.txt'

/** ファイルを Storage へ直接アップロードし、資料（または改訂版）を登録して取り込みを進める */
export function UploadPanel({ mode, onDone, onCancel }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [draft, setDraft] = useState<MetaDraft>(EMPTY_META_DRAFT)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function fail(message: string): void {
    setError(message)
    setStatus(null)
  }

  function onFileChange(next: File | null) {
    setFile(next)
    setError(null)
    // 新規登録でタイトル未入力なら、ファイル名（拡張子なし）を初期値にする
    if (next && mode.kind === 'new' && draft.title === '') {
      setDraft({ ...draft, title: next.name.replace(/\.[^.]+$/, '') })
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!file) return fail('ファイルを選択してください')
    const checked = validateUpload({ name: file.name, size: file.size, mime: file.type })
    if (checked.ok === false) return fail(checked.error)

    setBusy(true)
    try {
      setStatus('アップロードの準備をしています…')
      const sign = await createUploadUrlAction({ filename: file.name, size: file.size })
      if (sign.ok === false) return fail(sign.error)

      setStatus('ファイルをアップロードしています…')
      const { error: upErr } = await createBrowserClient()
        .storage.from(INFO_BANK_BUCKET)
        .uploadToSignedUrl(sign.path, sign.token, file, { contentType: checked.mime })
      if (upErr) return fail('ファイルのアップロードに失敗しました。もう一度お試しください')

      setStatus('資料を登録しています…')
      const upload = { path: sign.path, filename: file.name, size: file.size }
      let documentId: string
      if (mode.kind === 'new') {
        const reg = await registerDocumentAction(draftToInput(draft), upload)
        if (reg.ok === false) return fail(reg.error)
        documentId = reg.documentId
      } else {
        const reg = await registerRevisionAction(mode.documentId, upload)
        if (reg.ok === false) return fail(reg.error)
        documentId = mode.documentId
      }

      const result = await runIngest(ingestRunnerActions, documentId, p =>
        setStatus(progressLabel(p))
      )
      router.refresh()
      if (result.ok === false) {
        return fail(`${result.error}（一覧の「再実行」から続きを取り込めます）`)
      }
      setStatus(null)
      onDone()
    } catch (err) {
      fail(err instanceof Error ? err.message : '取り込みに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  const isRevision = mode.kind === 'revision'

  return (
    <form onSubmit={submit} className="space-y-3">
      {isRevision ? (
        <p className="text-sm text-slate-600">
          「{mode.title}
          」の改訂版をアップロードします。取り込みが完了するまで、現在の版が検索に使われ続けます。
        </p>
      ) : (
        <MetaFields value={draft} onChange={setDraft} disabled={busy} />
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-700">
          ファイル（PDF / Word / Excel / CSV / テキスト、50MB まで）
        </span>
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy}
          onChange={e => onFileChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <span className="mt-1 block text-xs text-slate-500">
          Google ドキュメント / スプレッドシートは、「ファイル → ダウンロード → Microsoft
          Word（.docx）/ Excel（.xlsx）」で書き出してから選んでください。
        </span>
      </label>

      {status ? (
        <p role="status" className="text-sm text-slate-600">
          {status}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? '処理中…' : isRevision ? '改訂版を取り込む' : '登録して取り込む'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            閉じる
          </Button>
        ) : null}
      </div>
    </form>
  )
}
