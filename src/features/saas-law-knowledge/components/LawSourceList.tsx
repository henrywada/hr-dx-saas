'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  triggerHrLawRefresh,
  createHrLawSource,
  disableHrLawSource,
  enableHrLawSource,
  deleteHrLawSource,
} from '../actions'
import type { HrLawSource } from '../types'

type Props = {
  sources: HrLawSource[]
}

export function LawSourceList({ sources }: Props) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  function handleRun(source: HrLawSource) {
    setPendingId(source.id)
    setMessage(null)
    startTransition(async () => {
      const result = await triggerHrLawRefresh(source.id)
      if (result.ok === true) {
        setMessage(
          `${source.topic}: ${result.documentsCreated}件登録・${result.documentsSkipped}件スキップ` +
            (result.queued != null ? `・キュー${result.queued}` : '')
        )
      } else {
        setMessage(`${source.topic}: 失敗 — ${result.error}`)
      }
      setPendingId(null)
    })
  }

  function handleCreate() {
    setMessage(null)
    startTransition(async () => {
      const result = await createHrLawSource({ topic, searchQuery })
      if (result.ok) {
        setMessage(`追加しました: ${topic}`)
        setTopic('')
        setSearchQuery('')
      } else {
        setMessage(`追加失敗 — ${result.error}`)
      }
    })
  }

  function handleDisable(source: HrLawSource) {
    if (!confirm(`「${source.topic}」を監視から外しますか？（無効化。収集済み文書は残ります）`))
      return
    setMessage(null)
    startTransition(async () => {
      const result = await disableHrLawSource(source.id)
      setMessage(result.ok ? `無効化: ${source.topic}` : `失敗 — ${result.error}`)
    })
  }

  function handleEnable(source: HrLawSource) {
    setMessage(null)
    startTransition(async () => {
      const result = await enableHrLawSource(source.id)
      setMessage(result.ok ? `再有効化: ${source.topic}` : `失敗 — ${result.error}`)
    })
  }

  function handleDelete(source: HrLawSource) {
    if (
      !confirm(
        `「${source.topic}」を監視トピックから完全削除しますか？\n` +
          `収集済み文書・詳細情報は残ります（トピック行のみ削除）。\nこの操作は元に戻せません。`
      )
    ) {
      return
    }
    setMessage(null)
    startTransition(async () => {
      const result = await deleteHrLawSource(source.id)
      setMessage(result.ok ? `完全削除: ${source.topic}` : `失敗 — ${result.error}`)
    })
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-xs rounded-lg border border-[#e2e6ec] bg-[#f6f8fa] px-3 py-2 text-[#24292f]">
          {message}
        </p>
      )}

      <div className="rounded-lg border border-[#e2e6ec] bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-[#24292f]">監視トピックを追加</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block text-xs text-[#57606a]">
            トピック名
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#e2e6ec] px-2.5 py-1.5 text-xs text-[#24292f]"
              placeholder="例: フリーランス新法"
            />
          </label>
          <label className="block text-xs text-[#57606a]">
            検索クエリ
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#e2e6ec] px-2.5 py-1.5 text-xs text-[#24292f]"
              placeholder="例: フリーランス 新法 通達"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={isPending || !topic.trim() || !searchQuery.trim()}
          onClick={handleCreate}
          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#FD7601] text-white hover:opacity-90 disabled:opacity-50"
        >
          追加
        </button>
      </div>

      <ul className="divide-y divide-[#e2e6ec] rounded-lg border border-[#e2e6ec] bg-white">
        {sources.map(source => (
          <li
            key={source.id}
            className={`flex items-center justify-between gap-3 px-4 py-3 ${
              source.enabled ? '' : 'bg-[#f6f8fa] opacity-80'
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#24292f]">
                {source.topic}
                {!source.enabled && (
                  <span className="ml-2 text-[10px] font-normal text-[#57606a]">（無効）</span>
                )}
              </p>
              <p className="text-xs text-[#57606a] mt-0.5 truncate">{source.search_query}</p>
              <p className="text-xs text-[#57606a] mt-0.5">
                最終実行:{' '}
                {source.last_run_at
                  ? format(new Date(source.last_run_at), 'M/d (E) HH:mm', { locale: ja })
                  : '未実行'}
                {source.origin ? ` · ${source.origin}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {source.enabled ? (
                <>
                  <button
                    type="button"
                    disabled={isPending && pendingId === source.id}
                    onClick={() => handleRun(source)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e2e6ec] text-[#24292f] hover:border-[#FD7601] hover:text-[#FD7601] disabled:opacity-50"
                  >
                    {isPending && pendingId === source.id ? '実行中…' : '手動実行'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleDisable(source)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg text-[#57606a] hover:underline disabled:opacity-50"
                  >
                    無効化
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleEnable(source)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e2e6ec] text-[#24292f] hover:border-[#FD7601] hover:text-[#FD7601] disabled:opacity-50"
                >
                  再有効化
                </button>
              )}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(source)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg text-[#cf222e] hover:underline disabled:opacity-50"
              >
                完全削除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
